import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";

import type { BackendScene3D, SceneLodLevel } from "../../types/backend";
import { backendHost, fetchSceneChildren } from "../../utils/backendApi";
import {
  getSceneNodeCoordinates,
  mergeSceneRotation,
  normalizeLodLevel,
  toSceneNode,
} from "./sceneNodeAdapter";

type SceneGraphicAttributes = {
  id: string;
  sceneId: string;
  parentId: string | null;
  rootSceneId: string;
  lodLevel: SceneLodLevel;
  name: string;
  fileUrl: string | null;
  type: "scene-root" | "scene-child";
  sceneNode: BackendScene3D;
  parentScene: BackendScene3D | null;
  rootScene: BackendScene3D;
  renderSignature: string;
};

export type SceneGraphic = Graphic & {
  attributes: SceneGraphicAttributes;
  visible?: boolean;
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

const makeRenderSignature = (
  scene: BackendScene3D,
  parent: BackendScene3D | null,
  root: BackendScene3D,
) =>
  JSON.stringify({
    sceneId: scene.id,
    fileUrl: scene.fileUrl,
    lodLevel: scene.lodLevel ?? 0,
    position: scene.position ?? null,
    rotation: scene.rotation ?? null,
    scale: scene.scale ?? null,
    parentId: parent?.id ?? null,
    parentPosition: parent?.position ?? null,
    parentRotation: parent?.rotation ?? null,
    rootPosition: root.position ?? null,
    rootRotation: root.rotation ?? null,
  });

export class SceneLodRenderer {
  private loadedSceneNodes = new Map<string, SceneGraphic>();
  private childrenCache = new Map<string, BackendScene3D[]>();
  private readonly layer: GraphicsLayer;

  constructor(layer: GraphicsLayer) {
    this.layer = layer;
  }

  clearDataCache() {
    this.childrenCache.clear();
  }

  dispose() {
    for (const graphic of this.loadedSceneNodes.values()) {
      this.layer.remove(graphic);
    }
    this.loadedSceneNodes.clear();
    this.childrenCache.clear();
  }

  getGraphic(nodeId: string) {
    return this.loadedSceneNodes.get(nodeId) ?? null;
  }

  async sync(
    rootScenes: BackendScene3D[],
    activeLodLevelsBySceneId: Record<string, SceneLodLevel>,
  ) {
    const activeRootIds = new Set(rootScenes.map((scene) => scene.id));

    for (const [nodeId, graphic] of this.loadedSceneNodes) {
      if (!activeRootIds.has(graphic.attributes.rootSceneId)) {
        this.layer.remove(graphic);
        this.loadedSceneNodes.delete(nodeId);
      }
    }

    for (const rootScene of rootScenes) {
      const activeLodLevel = activeLodLevelsBySceneId[rootScene.id] ?? 0;

      if (rootScene.visible === false) {
        this.setRootVisibility(rootScene.id, false, activeLodLevel);
        continue;
      }

      if (rootScene.fileUrl) {
        this.ensureGraphic(rootScene, null, rootScene);
      }

      if (activeLodLevel > 0) {
        await this.ensureDescendants(rootScene, rootScene, activeLodLevel);
      }

      this.setRootVisibility(rootScene.id, true, activeLodLevel);
    }
  }

  private async ensureDescendants(
    rootScene: BackendScene3D,
    parent: BackendScene3D,
    activeLodLevel: SceneLodLevel,
  ) {
    const children = await this.loadChildren(parent.id);

    for (const child of children) {
      if (child.visible === false || !child.fileUrl) continue;

      this.ensureGraphic(child, parent, rootScene);

      if (normalizeLodLevel(child.lodLevel) < activeLodLevel) {
        await this.ensureDescendants(rootScene, child, activeLodLevel);
      }
    }
  }

  private async loadChildren(parentId: string) {
    const cached = this.childrenCache.get(parentId);
    if (cached) return cached;

    // Cache fetched node data so switching LOD or clicking does not reload GLB/children.
    const children = await fetchSceneChildren(parentId, 1).catch((err) => {
      console.error("Failed to load scene children:", err);
      return [] as BackendScene3D[];
    });
    this.childrenCache.set(parentId, children);
    return children;
  }

  private ensureGraphic(
    scene: BackendScene3D,
    parent: BackendScene3D | null,
    rootScene: BackendScene3D,
  ) {
    const node = toSceneNode(scene, parent);
    const signature = makeRenderSignature(scene, parent, rootScene);
    const existing = this.loadedSceneNodes.get(scene.id);

    if (existing) {
      if (existing.attributes.renderSignature !== signature) {
        this.updateGraphic(existing, scene, parent, rootScene, signature);
      }
      return existing;
    }

    const graphic = new Graphic() as SceneGraphic;
    this.updateGraphic(graphic, scene, parent, rootScene, signature);
    graphic.popupTemplate = {
      title: "{name}",
      content: `Scene model LOD ${node.lodLevel}.`,
    };
    this.layer.add(graphic);
    this.loadedSceneNodes.set(scene.id, graphic);
    return graphic;
  }

  private updateGraphic(
    graphic: SceneGraphic,
    scene: BackendScene3D,
    parent: BackendScene3D | null,
    rootScene: BackendScene3D,
    signature: string,
  ) {
    const node = toSceneNode(scene, parent);
    const coords = getSceneNodeCoordinates(scene, parent);
    const rotation = parent ? mergeSceneRotation(parent, scene) : scene.rotation ?? { x: 0, y: 0, z: 0 };

    graphic.geometry = new Point({
      longitude: coords.longitude,
      latitude: coords.latitude,
      z: coords.elevation,
    });
    graphic.symbol = createModelSymbol(
      node.modelUrl ?? "",
      node.transform?.scale ?? { x: 1, y: 1, z: 1 },
      rotation,
    );
    graphic.attributes = {
      id: scene.id,
      sceneId: node.sceneId,
      parentId: node.parentId ?? null,
      rootSceneId: rootScene.id,
      lodLevel: node.lodLevel,
      name: scene.name,
      fileUrl: node.modelUrl ?? null,
      type: node.lodLevel === 0 ? "scene-root" : "scene-child",
      sceneNode: scene,
      parentScene: parent,
      rootScene,
      renderSignature: signature,
    };
  }

  private setRootVisibility(
    rootSceneId: string,
    rootVisible: boolean,
    activeLodLevel: SceneLodLevel,
  ) {
    for (const graphic of this.loadedSceneNodes.values()) {
      if (graphic.attributes.rootSceneId !== rootSceneId) continue;
      // LOD selection changes only hit-test visibility; cached graphics stay loaded.
      graphic.visible = rootVisible && graphic.attributes.lodLevel === activeLodLevel;
    }
  }
}
