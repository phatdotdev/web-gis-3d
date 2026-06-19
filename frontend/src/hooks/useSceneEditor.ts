import { useEffect, useRef } from "react";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import type SceneView from "@arcgis/core/views/SceneView";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  selectSceneEditMode,
  setSceneEditingNodeId,
} from "../store/mapSlice";
import { updateSceneTransform } from "../utils/backendApi";

// Inverse projection: geographical delta -> Cartesian offset (meters) relative to parent heading
const calculateOffset = (
  parentLat: number,
  parentLng: number,
  parentElevation: number,
  parentHeading: number,
  childLat: number,
  childLng: number,
  childElevation: number,
) => {
  const deltaLng = childLng - parentLng;
  const deltaLat = childLat - parentLat;

  const dx = deltaLng * 111132 * Math.cos((parentLat * Math.PI) / 180);
  const dy = deltaLat * 111132;
  const headingRad = (parentHeading * Math.PI) / 180;

  const baseDx = dx * Math.cos(headingRad) - dy * Math.sin(headingRad);
  const baseDy = dx * Math.sin(headingRad) + dy * Math.cos(headingRad);

  return {
    x: baseDx,
    y: childElevation - parentElevation,
    z: -baseDy,
  };
};

export const useSceneEditor = (
  viewRef: React.RefObject<SceneView | null>,
  sceneLodLayerRef: React.RefObject<GraphicsLayer | null>,
  onSceneUpdated?: () => void,
) => {
  const dispatch = useAppDispatch();
  const sceneEditMode = useAppSelector(selectSceneEditMode);

  const sketchVMRef = useRef<SketchViewModel | null>(null);
  const selectedGraphicRef = useRef<Graphic | null>(null);

  // Initialize SketchViewModel for Scene3D editing
  useEffect(() => {
    const view = viewRef.current;
    const layer = sceneLodLayerRef.current;
    if (!view || !layer) return;

    const sketchVM = new SketchViewModel({
      view,
      layer,
      updateOnGraphicClick: false,
      defaultUpdateOptions: {
        tool: "transform",
        enableRotation: true,
        enableScaling: true,
        enableZ: true,
        preserveAspectRatio: false,
        multipleSelectionEnabled: false,
      } as any,
    });

    sketchVMRef.current = sketchVM;

    // Handle updates
    const updateHandle = sketchVM.on("update", (event) => {
      const graphic = event.graphics?.[0];
      if (!graphic) return;

      if (event.state === "complete") {
        const point = graphic.geometry instanceof Point ? graphic.geometry : null;
        if (!point) return;

        const symbolLayers = (graphic.symbol as any)?.symbolLayers;
        const symbolLayer = symbolLayers?.getItemAt?.(0) ?? symbolLayers?.[0];
        if (!symbolLayer) return;

        // Get transform values from the model symbol layer
        const heading = symbolLayer.heading ?? 0;
        const tilt = symbolLayer.tilt ?? 0;
        const roll = symbolLayer.roll ?? 0;
        const scaleX = symbolLayer.width ?? 1;
        const scaleY = symbolLayer.depth ?? 1;
        const scaleZ = symbolLayer.height ?? 1;

        const nodeId = graphic.attributes.id;
        const parentId = graphic.attributes.parentId;
        const isChild = graphic.attributes.type === "scene-child";

        let newPosition = { x: point.longitude ?? 0, y: point.latitude ?? 0, z: point.z ?? 0 };
        let newRotation = { x: tilt, y: roll, z: heading };
        let newScale = { x: scaleX ?? 1, y: scaleY ?? 1, z: scaleZ ?? 1 };

        if (isChild && parentId) {
          // Find parent graphic in the layer to get parent's coordinates
          const parentGraphic = layer.graphics.find((g) => g.attributes.id === parentId);
          const parentPosition = graphic.attributes.parentPosition as
            | { x: number; y: number; z: number }
            | null
            | undefined;
          const parentRotation = graphic.attributes.parentRotation as
            | { x: number; y: number; z: number }
            | null
            | undefined;

          const parentPoint =
            parentGraphic?.geometry instanceof Point
              ? parentGraphic.geometry
              : parentPosition
                ? new Point({
                    longitude: parentPosition.x,
                    latitude: parentPosition.y,
                    z: parentPosition.z,
                  })
                : null;

          if (parentPoint) {
            const parentSymbolLayers = (parentGraphic?.symbol as any)?.symbolLayers;
            const parentSymbolLayer = parentSymbolLayers?.getItemAt?.(0) ?? parentSymbolLayers?.[0];
            const parentHeading = parentSymbolLayer?.heading ?? parentRotation?.z ?? 0;
            const parentTilt = parentSymbolLayer?.tilt ?? parentRotation?.x ?? 0;
            const parentRoll = parentSymbolLayer?.roll ?? parentRotation?.y ?? 0;

            const offset = calculateOffset(
              parentPoint.latitude ?? 0,
              parentPoint.longitude ?? 0,
              parentPoint.z ?? 0,
              parentHeading ?? 0,
              point.latitude ?? 0,
              point.longitude ?? 0,
              point.z ?? 0,
            );

            newPosition = offset;
            newRotation = {
              x: tilt - parentTilt,
              y: roll - parentRoll,
              z: heading - parentHeading,
            };
          }
        }

        // Persist to backend
        updateSceneTransform(nodeId, {
          position: newPosition,
          rotation: newRotation,
          scale: newScale,
        })
          .then(() => {
            if (onSceneUpdated) onSceneUpdated();
          })
          .catch((err) => console.error("Failed to save scene transform:", err));
      }
    });

    return () => {
      updateHandle.remove();
      sketchVM.destroy();
      sketchVMRef.current = null;
    };
  }, [viewRef, sceneLodLayerRef, onSceneUpdated]);

  // Handle click selection when edit mode is active
  useEffect(() => {
    const view = viewRef.current;
    const layer = sceneLodLayerRef.current;
    const sketchVM = sketchVMRef.current;
    if (!view || !layer || !sketchVM) return;

    if (!sceneEditMode) {
      sketchVM.cancel();
      selectedGraphicRef.current = null;
      dispatch(setSceneEditingNodeId(null));
      return;
    }

    const clickHandle = view.on("click", (event) => {
      void view.hitTest(event).then((response) => {
        // Find if we hit any graphic in the sceneLodLayer
        const hit = response.results.find(
          (result) =>
            result.type === "graphic" &&
            result.graphic.layer === layer &&
            (result.graphic.attributes?.type === "scene-root" ||
              result.graphic.attributes?.type === "scene-child"),
        );

        if (hit && hit.type === "graphic") {
          event.stopPropagation();
          const graphic = hit.graphic;
          selectedGraphicRef.current = graphic;
          dispatch(setSceneEditingNodeId(graphic.attributes.id));
          void sketchVM.update([graphic]);
        } else {
          // Clicked empty space: cancel editing
          sketchVM.cancel();
          selectedGraphicRef.current = null;
          dispatch(setSceneEditingNodeId(null));
        }
      });
    });

    return () => {
      clickHandle.remove();
    };
  }, [sceneEditMode, viewRef, sceneLodLayerRef, dispatch]);
};
