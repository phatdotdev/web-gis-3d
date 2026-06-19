import { useEffect, useRef } from "react";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import type SceneView from "@arcgis/core/views/SceneView";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectPlacementMode, selectPlacementPreview, updatePlacementPreview } from "../store/mapSlice";
import { backendHost } from "../utils/backendApi";

const toResolvedUrl = (href: string) => {
  if (!href) return "";
  if (href.startsWith("http")) return href;
  return `${backendHost}${href.startsWith("/") ? "" : "/"}${href}`;
};

export const usePlacementMode = (
  viewRef: React.RefObject<SceneView | null>,
  graphicsLayerRef: React.RefObject<GraphicsLayer | null>,
  fileUrl?: string | null
) => {
  const dispatch = useAppDispatch();
  const placementMode = useAppSelector(selectPlacementMode);
  const placementPreview = useAppSelector(selectPlacementPreview);

  const previewGraphicRef = useRef<Graphic | null>(null);

  // Xử lý cursor
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !view.container) return;
    if (placementMode) {
      view.container.style.cursor = "crosshair";
    } else {
      view.container.style.cursor = "default";
    }
    return () => {
      if (view && view.container) {
        view.container.style.cursor = "default";
      }
    };
  }, [placementMode, viewRef]);

  // Lắng nghe sự kiện click trên bản đồ
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !placementMode) return;

    const clickHandle = view.on("click", (event) => {
      event.stopPropagation();
      const point = view.toMap(event);
      if (point) {
        dispatch(
          updatePlacementPreview({
            longitude: point.longitude,
            latitude: point.latitude,
            elevation: point.z ?? 0,
            heading: placementPreview?.heading ?? 0, // Giữ nguyên heading hiện tại nếu đã click
          })
        );
      }
    });

    return () => clickHandle.remove();
  }, [placementMode, viewRef, dispatch, placementPreview?.heading]);

  // Vẽ Graphic preview
  useEffect(() => {
    const layer = graphicsLayerRef.current;
    if (!layer || !placementMode || !placementPreview || !fileUrl) {
      // Clear preview
      if (previewGraphicRef.current && layer) {
        layer.remove(previewGraphicRef.current);
        previewGraphicRef.current = null;
      }
      return;
    }

    if (previewGraphicRef.current) {
      layer.remove(previewGraphicRef.current);
    }

    const point = new Point({
      longitude: placementPreview.longitude,
      latitude: placementPreview.latitude,
      z: placementPreview.elevation,
    });

    const scaleVal = (placementPreview as any).scale ?? 1;
    const symbol = {
      type: "point-3d",
      symbolLayers: [
        {
          type: "object",
          resource: { href: toResolvedUrl(fileUrl) },
          heading: placementPreview.heading,
          anchor: "origin",
          material: { color: [255, 255, 255, 0.7] }, // Bán trong suốt để biết là đang preview
          ...(scaleVal !== 1 ? {
            width: scaleVal,
            depth: scaleVal,
            height: scaleVal,
          } : {}),
        },
      ],
    } as any;

    const graphic = new Graphic({
      geometry: point,
      symbol,
    });

    layer.add(graphic);
    previewGraphicRef.current = graphic;

    return () => {
      if (previewGraphicRef.current) {
        layer.remove(previewGraphicRef.current);
        previewGraphicRef.current = null;
      }
    };
  }, [placementMode, placementPreview, fileUrl, graphicsLayerRef]);
};
