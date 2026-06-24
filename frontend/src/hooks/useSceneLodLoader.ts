import { useEffect, useRef, useState } from "react";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import type SceneView from "@arcgis/core/views/SceneView";

import type { BackendScene3D } from "../types/backend";
import { fetchScenesByLod } from "../utils/backendApi";
import { useAppSelector } from "../store/hooks";
import { selectActiveLodLevel, selectSceneLodLevelsBySceneId } from "../store/mapSlice";
import { SceneLodRenderer } from "../features/Scene3D/SceneLodRenderer";

export const useSceneLodLoader = (
  viewRef: React.RefObject<SceneView | null>,
  graphicsLayerRef: React.RefObject<GraphicsLayer | null>,
) => {
  const activeLodLevelsBySceneId = useAppSelector(selectSceneLodLevelsBySceneId);
  const activeLodLevel = useAppSelector(selectActiveLodLevel);
  const [rootScenes, setRootScenes] = useState<BackendScene3D[]>([]);
  const rendererRef = useRef<SceneLodRenderer | null>(null);

  useEffect(() => {
    let active = true;

    const load = (event?: Event) => {
      const parentId = (event as CustomEvent<{ parentId?: string }> | undefined)?.detail?.parentId;
      if (parentId) {
        rendererRef.current?.invalidateBranch(parentId);
      } else {
        rendererRef.current?.clearDataCache();
      }
      fetchScenesByLod(0)
        .then((data) => {
          if (active) setRootScenes(data);
        })
        .catch((err) => console.error("Failed to load root scenes:", err));
    };

    load();
    window.addEventListener("scene3d:reload", load);

    return () => {
      active = false;
      window.removeEventListener("scene3d:reload", load);
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    const layer = graphicsLayerRef.current;
    if (!view || !layer) return;

    if (!rendererRef.current) {
      rendererRef.current = new SceneLodRenderer(layer);
    }

    let cancelled = false;
    const syncRenderer = async () => {
      // Changing LOD updates graphic visibility and hit-test targets only.
      await rendererRef.current?.sync(rootScenes, activeLodLevelsBySceneId, activeLodLevel);
    };

    void syncRenderer().catch((err) => {
      if (!cancelled) console.error("Failed to sync scene LOD renderer:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [viewRef, graphicsLayerRef, rootScenes, activeLodLevelsBySceneId, activeLodLevel]);

  useEffect(() => {
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  return {
    rootScenes,
    reloadScenes: async () => {
      rendererRef.current?.clearDataCache();
      const data = await fetchScenesByLod(0);
      setRootScenes(data);
    },
  };
};
