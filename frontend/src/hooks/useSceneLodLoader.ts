import { useEffect, useRef, useState } from "react";
import { watch } from "@arcgis/core/core/reactiveUtils";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import type SceneView from "@arcgis/core/views/SceneView";
import type { BackendScene3D } from "../types/backend";
import { backendHost, fetchSceneChildren, fetchScenesByLod } from "../utils/backendApi";
import { useAppSelector } from "../store/hooks";
import { selectSceneEditMode, selectSceneEditingNodeId } from "../store/mapSlice";

type RenderedSceneGraphics = {
  root: Graphic | null;
  children: Graphic[];
};

const toResolvedUrl = (href: string) => {
  if (!href) return "";
  if (href.startsWith("http")) return href;
  return `${backendHost}${href.startsWith("/") ? "" : "/"}${href}`;
};

const createModelSymbol = (
  fileUrl: string,
  scale = { x: 1, y: 1, z: 1 },
  rotation = { x: 0, y: 0, z: 0 },
) => {
  const modelLayer: Record<string, unknown> = {
    type: "object",
    resource: { href: toResolvedUrl(fileUrl) },
    heading: rotation.z ?? 0,
    tilt: rotation.x ?? 0,
    roll: rotation.y ?? 0,
    anchor: "origin",
  };

  // ArcGIS width/depth/height are absolute dimensions. Leaving them unset for
  // the default 1:1 case preserves the native GLB size after splitting.
  if (scale.x !== 1 || scale.y !== 1 || scale.z !== 1) {
    modelLayer.width = scale.x ?? 1;
    modelLayer.depth = scale.y ?? 1;
    modelLayer.height = scale.z ?? 1;
  }

  return {
    type: "point-3d",
    symbolLayers: [modelLayer],
  } as any;
};

const projectChildOffset = (parent: BackendScene3D, child: BackendScene3D) => {
  const parentLng = parent.position?.x ?? 0;
  const parentLat = parent.position?.y ?? 0;
  const parentElevation = parent.position?.z ?? 0;
  const parentHeading = parent.rotation?.z ?? 0;
  const offset = child.position ?? { x: 0, y: 0, z: 0 };

  const headingRad = (parentHeading * Math.PI) / 180;
  const baseDx = offset.x;
  const baseDy = -offset.z;
  const baseDz = offset.y;

  const dx = baseDx * Math.cos(headingRad) + baseDy * Math.sin(headingRad);
  const dy = -baseDx * Math.sin(headingRad) + baseDy * Math.cos(headingRad);
  const metersPerDegreeLat = 111132;
  const metersPerDegreeLng =
    metersPerDegreeLat * Math.cos((parentLat * Math.PI) / 180);

  return {
    longitude: parentLng + dx / metersPerDegreeLng,
    latitude: parentLat + dy / metersPerDegreeLat,
    elevation: parentElevation + baseDz,
  };
};

const mergeRotation = (parent: BackendScene3D, child: BackendScene3D) => ({
  x: (parent.rotation?.x ?? 0) + (child.rotation?.x ?? 0),
  y: (parent.rotation?.y ?? 0) + (child.rotation?.y ?? 0),
  z: (parent.rotation?.z ?? 0) + (child.rotation?.z ?? 0),
});

export const useSceneLodLoader = (
  viewRef: React.RefObject<SceneView | null>,
  graphicsLayerRef: React.RefObject<GraphicsLayer | null>,
) => {
  const sceneEditMode = useAppSelector(selectSceneEditMode);
  const sceneEditingNodeId = useAppSelector(selectSceneEditingNodeId);
  const [rootScenes, setRootScenes] = useState<BackendScene3D[]>([]);
  const renderedGraphicsRef = useRef<Record<string, RenderedSceneGraphics>>({});
  const childrenCacheRef = useRef<Record<string, BackendScene3D[]>>({});

  useEffect(() => {
    let active = true;

    const load = () => {
      childrenCacheRef.current = {};
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
    if (!view || !layer || rootScenes.length === 0) return;

    const removeChildren = (current: RenderedSceneGraphics) => {
      current.children.forEach((graphic) => layer.remove(graphic));
      current.children = [];
    };

    const shouldRenderChildren = (parent: BackendScene3D) =>
      sceneEditMode ||
      Boolean(sceneEditingNodeId && parent.children?.some((child) => child.id === sceneEditingNodeId));

    const renderChildren = async (parent: BackendScene3D, current: RenderedSceneGraphics) => {
      if (current.children.length > 0) return;

      let children = parent.children ?? childrenCacheRef.current[parent.id] ?? [];
      if (children.length === 0) {
        try {
          children = await fetchSceneChildren(parent.id, 1);
          childrenCacheRef.current[parent.id] = children;
        } catch (err) {
          console.error("Failed to load scene children:", err);
        }
      }

      current.children = children
        .filter((child) => child.visible !== false && Boolean(child.fileUrl))
        .map((child) => {
          const coords = projectChildOffset(parent, child);
          const point = new Point({
            longitude: coords.longitude,
            latitude: coords.latitude,
            z: coords.elevation,
          });
          const rotation = mergeRotation(parent, child);

          const graphic = new Graphic({
            geometry: point,
            symbol: createModelSymbol(
              child.fileUrl ?? "",
              child.scale ?? { x: 1, y: 1, z: 1 },
              rotation,
            ),
            attributes: {
              id: child.id,
              entityId: child.entities?.[0]?.id ?? null,
              parentId: parent.id,
              lodLevel: child.lodLevel ?? 1,
              name: child.name,
              fileUrl: child.fileUrl,
              type: "scene-child",
              parentPosition: parent.position ?? { x: 0, y: 0, z: 0 },
              parentRotation: parent.rotation ?? { x: 0, y: 0, z: 0 },
            },
            popupTemplate: {
              title: "{name}",
              content: "Scene child model.",
            },
          });

          layer.add(graphic);
          return graphic;
        });
    };

    const updateRootModels = async () => {
      for (const parent of rootScenes) {
        const currentRendered =
          renderedGraphicsRef.current[parent.id] ?? { root: null, children: [] };

        if (!parent.visible) {
          if (currentRendered.root) {
            layer.remove(currentRendered.root);
            currentRendered.root = null;
          }
          renderedGraphicsRef.current[parent.id] = currentRendered;
          continue;
        }

        if (shouldRenderChildren(parent)) {
          if (currentRendered.root) {
            layer.remove(currentRendered.root);
            currentRendered.root = null;
          }
          await renderChildren(parent, currentRendered);
          if (currentRendered.children.length > 0) {
            renderedGraphicsRef.current[parent.id] = currentRendered;
            continue;
          }
        }

        removeChildren(currentRendered);

        if (!currentRendered.root && parent.fileUrl) {
          const point = new Point({
            longitude: parent.position?.x ?? 0,
            latitude: parent.position?.y ?? 0,
            z: parent.position?.z ?? 0,
          });

          const graphic = new Graphic({
            geometry: point,
            symbol: createModelSymbol(
              parent.fileUrl,
              parent.scale ?? { x: 1, y: 1, z: 1 },
              parent.rotation ?? { x: 0, y: 0, z: 0 },
            ),
            attributes: {
              id: parent.id,
              parentId: null,
              lodLevel: 0,
              name: parent.name,
              fileUrl: parent.fileUrl,
              type: "scene-root",
              parentPosition: null,
              parentRotation: null,
            },
            popupTemplate: {
              title: "{name}",
              content: "Scene root model (LOD 0).",
            },
          });

          layer.add(graphic);
          currentRendered.root = graphic;
        }

        renderedGraphicsRef.current[parent.id] = currentRendered;
      }
    };

    const handle = watch(() => [view.camera], () => {
      void updateRootModels();
    });

    void updateRootModels();

    return () => {
      handle.remove();
      Object.values(renderedGraphicsRef.current).forEach((current) => {
        if (current.root) layer.remove(current.root);
        current.children.forEach((graphic) => layer.remove(graphic));
      });
      renderedGraphicsRef.current = {};
    };
  }, [viewRef, graphicsLayerRef, rootScenes, sceneEditMode, sceneEditingNodeId]);

  return {
    rootScenes,
    reloadScenes: async () => {
      childrenCacheRef.current = {};
      const data = await fetchScenesByLod(0);
      setRootScenes(data);
    },
  };
};
