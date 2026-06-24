import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";

import type { BackendScene3D, SceneLodLevel } from "../../types/backend";
import { backendHost, fetchSceneChildren } from "../../utils/backendApi";
import {
  normalizeLodLevel,
  toSceneNode,
} from "./sceneNodeAdapter";

type SceneGraphicAttributes = {
  id: string;
  parentId: string | null;
  rootSceneId: string;
  lodLevel: SceneLodLevel;
  name: string;
  fileUrl: string | null;
  breadcrumb: string;
  childCount: number;
  parentPosition: { x: number; y: number; z: number } | null;
  parentRotation: { x: number; y: number; z: number } | null;
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
  worldTransform: SceneWorldTransform,
) =>
  JSON.stringify({
    sceneId: scene.id,
    fileUrl: scene.fileUrl,
    lodLevel: scene.lodLevel ?? 0,
    position: scene.position ?? null,
    rotation: scene.rotation ?? null,
    scale: scene.scale ?? null,
    parentId: parent?.id ?? null,
    rootPosition: root.position ?? null,
    rootRotation: root.rotation ?? null,
    worldTransform,
  });

type SceneWorldTransform = {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
};

type ResolvedSceneNode = {
  scene: BackendScene3D;
  parent: BackendScene3D | null;
  root: BackendScene3D;
  breadcrumb: string;
  worldTransform: SceneWorldTransform;
  parentWorldTransform: SceneWorldTransform | null;
};

const defaultPosition = { x: 0, y: 0, z: 0 };
const defaultRotation = { x: 0, y: 0, z: 0 };
const defaultScale = { x: 1, y: 1, z: 1 };

const projectChildWorldPosition = (
  parentWorld: SceneWorldTransform,
  child: BackendScene3D,
) => {
  const parentLng = parentWorld.position.x;
  const parentLat = parentWorld.position.y;
  const parentElevation = parentWorld.position.z;
  const parentHeading = parentWorld.rotation.z ?? 0;
  const offset = child.position ?? defaultPosition;

  const headingRad = (parentHeading * Math.PI) / 180;
  const baseDx = offset.x;
  const baseDy = -offset.z;
  const baseDz = offset.y;

  const dx = baseDx * Math.cos(headingRad) + baseDy * Math.sin(headingRad);
  const dy = -baseDx * Math.sin(headingRad) + baseDy * Math.cos(headingRad);
  const metersPerDegreeLat = 111132;
  const metersPerDegreeLng =
    metersPerDegreeLat * Math.cos((parentLat * Math.PI) / 180) || metersPerDegreeLat;

  return {
    x: parentLng + dx / metersPerDegreeLng,
    y: parentLat + dy / metersPerDegreeLat,
    z: parentElevation + baseDz,
  };
};

const mergeWorldTransform = (
  scene: BackendScene3D,
  parentWorldTransform: SceneWorldTransform | null,
): SceneWorldTransform => {
  const localPosition = scene.position ?? defaultPosition;
  const localRotation = scene.rotation ?? defaultRotation;
  const localScale = scene.scale ?? defaultScale;

  if (!parentWorldTransform || normalizeLodLevel(scene.lodLevel) === 0) {
    return {
      position: localPosition,
      rotation: localRotation,
      scale: localScale,
    };
  }

  return {
    position: projectChildWorldPosition(parentWorldTransform, scene),
    rotation: {
      x: parentWorldTransform.rotation.x + localRotation.x,
      y: parentWorldTransform.rotation.y + localRotation.y,
      z: parentWorldTransform.rotation.z + localRotation.z,
    },
    scale: {
      x: parentWorldTransform.scale.x * localScale.x,
      y: parentWorldTransform.scale.y * localScale.y,
      z: parentWorldTransform.scale.z * localScale.z,
    },
  };
};

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

  invalidateBranch(nodeId: string) {
    this.childrenCache.delete(nodeId);
    for (const [cachedParentId, children] of [...this.childrenCache.entries()]) {
      if (children.some((child) => child.id === nodeId)) {
        this.childrenCache.delete(cachedParentId);
      }
    }
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
    defaultActiveLodLevel: SceneLodLevel = 0,
  ) {
    const activeRootIds = new Set(rootScenes.map((scene) => scene.id));

    for (const [nodeId, graphic] of this.loadedSceneNodes) {
      if (!activeRootIds.has(graphic.attributes.rootSceneId)) {
        this.layer.remove(graphic);
        this.loadedSceneNodes.delete(nodeId);
      }
    }

    for (const rootScene of rootScenes) {
      const activeLodLevel = activeLodLevelsBySceneId[rootScene.id] ?? defaultActiveLodLevel;

      if (rootScene.visible === false) {
        this.setRootVisibility(rootScene.id, false, new Set());
        continue;
      }

      const visibleNodes = await this.resolveVisibleNodes(
        rootScene,
        null,
        rootScene,
        activeLodLevel,
        rootScene.name,
        null,
      );
      const visibleNodeIds = new Set<string>();

      for (const node of visibleNodes) {
        if (!node.scene.fileUrl) continue;
        visibleNodeIds.add(node.scene.id);
        this.ensureGraphic(node);
      }

      this.setRootVisibility(rootScene.id, true, visibleNodeIds);
    }
  }

  private async resolveVisibleNodes(
    scene: BackendScene3D,
    parent: BackendScene3D | null,
    rootScene: BackendScene3D,
    targetLodLevel: SceneLodLevel,
    breadcrumb: string,
    parentWorldTransform: SceneWorldTransform | null,
  ): Promise<ResolvedSceneNode[]> {
    const worldTransform = mergeWorldTransform(scene, parentWorldTransform);
    const resolvedNode: ResolvedSceneNode = {
      scene,
      parent,
      root: rootScene,
      breadcrumb,
      worldTransform,
      parentWorldTransform,
    };

    if (normalizeLodLevel(scene.lodLevel) >= targetLodLevel) {
      return [resolvedNode];
    }

    const children = (await this.loadChildren(scene.id)).filter(
      (child) => child.visible !== false,
    );

    if (children.length === 0) {
      return [resolvedNode];
    }

    const resolvedChildren = await Promise.all(
      children.map((child) =>
        this.resolveVisibleNodes(
          child,
          scene,
          rootScene,
          targetLodLevel,
          `${breadcrumb} > ${child.name}`,
          worldTransform,
        ),
      ),
    );

    const flattenedChildren = resolvedChildren.flat();
    if (!flattenedChildren.some((child) => Boolean(child.scene.fileUrl))) {
      return [resolvedNode];
    }

    return flattenedChildren;
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

  private ensureGraphic(resolvedNode: ResolvedSceneNode) {
    const { scene, parent, root: rootScene, worldTransform } = resolvedNode;
    const node = toSceneNode(scene, parent);
    const signature = makeRenderSignature(scene, parent, rootScene, worldTransform);
    const existing = this.loadedSceneNodes.get(scene.id);

    if (existing) {
      if (existing.attributes.renderSignature !== signature) {
        this.updateGraphic(existing, resolvedNode, signature);
      }
      return existing;
    }

    const graphic = new Graphic() as SceneGraphic;
    this.updateGraphic(graphic, resolvedNode, signature);
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
    resolvedNode: ResolvedSceneNode,
    signature: string,
  ) {
    const { scene, parent, root: rootScene, breadcrumb, worldTransform, parentWorldTransform } = resolvedNode;
    const node = toSceneNode(scene, parent);

    graphic.geometry = new Point({
      longitude: worldTransform.position.x,
      latitude: worldTransform.position.y,
      z: worldTransform.position.z,
    });
    graphic.symbol = createModelSymbol(
      node.fileUrl ?? "",
      worldTransform.scale,
      worldTransform.rotation,
    );
    graphic.attributes = {
      id: scene.id,
      parentId: node.parentId ?? null,
      rootSceneId: rootScene.id,
      lodLevel: node.lodLevel,
      name: scene.name,
      fileUrl: node.fileUrl ?? null,
      breadcrumb,
      childCount: scene.children?.length ?? node.childCount ?? 0,
      parentPosition: parentWorldTransform?.position ?? null,
      parentRotation: parentWorldTransform?.rotation ?? null,
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
    visibleNodeIds: Set<string>,
  ) {
    for (const graphic of this.loadedSceneNodes.values()) {
      if (graphic.attributes.rootSceneId !== rootSceneId) continue;
      // LOD selection changes only hit-test visibility; cached graphics stay loaded.
      graphic.visible = rootVisible && visibleNodeIds.has(graphic.attributes.id);
    }
  }
}
