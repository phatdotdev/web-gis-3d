import type Graphic from "@arcgis/core/Graphic";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";

import type { BackendScene3D, SceneLodLevel } from "../../types/backend";
import { sceneNodeToVirtualEntity } from "./sceneNodeAdapter";
import type { SceneGraphic } from "./SceneLodRenderer";

type SceneHitResult = {
  type?: string;
  graphic?: Graphic;
};

const isSceneGraphic = (graphic: Graphic | null | undefined): graphic is SceneGraphic => {
  const type = graphic?.attributes?.type;
  return type === "scene-root" || type === "scene-child";
};

export const findSceneGraphicForActiveLod = (
  results: readonly SceneHitResult[],
  sceneLayer: GraphicsLayer | null,
  activeLodLevel: SceneLodLevel,
) => {
  for (const result of results ?? []) {
    if (result.type !== "graphic") continue;
    const graphic = result.graphic;
    if (!graphic) continue;
    if (graphic.layer !== sceneLayer || !isSceneGraphic(graphic)) continue;
    if (graphic.attributes.lodLevel === activeLodLevel) return graphic;
  }

  return null;
};

export const createInspectedSceneEntity = (
  graphic: SceneGraphic,
  activeLodLevel: SceneLodLevel,
) => {
  const scene = graphic.attributes.sceneNode as BackendScene3D;
  const parent = graphic.attributes.parentScene as BackendScene3D | null;
  return sceneNodeToVirtualEntity(scene, parent, activeLodLevel);
};
