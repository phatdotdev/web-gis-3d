import type { BackendScene3D, BackendSpatialEntity, SceneLodLevel, SceneNode } from "../../types/backend";

export const normalizeLodLevel = (value: unknown): SceneLodLevel => {
  return value === 1 || value === 2 ? value : 0;
};

export const getSceneParentId = (scene: BackendScene3D) => scene.parent?.id ?? null;

export const toSceneNode = (
  scene: BackendScene3D,
  parent?: BackendScene3D | null,
): SceneNode => {
  const lodLevel = normalizeLodLevel(scene.lodLevel);
  return {
    id: scene.id,
    sceneId: lodLevel === 0 ? scene.id : parent?.id ?? scene.parent?.id ?? scene.id,
    parentId: parent?.id ?? scene.parent?.id ?? null,
    name: scene.name,
    lodLevel,
    modelUrl: scene.fileUrl ?? null,
    transform: {
      position: scene.position ?? { x: 0, y: 0, z: 0 },
      rotation: scene.rotation ?? { x: 0, y: 0, z: 0 },
      scale: scene.scale ?? { x: 1, y: 1, z: 1 },
    },
    metadata: scene.metadata ?? {},
    source: scene,
    parent: parent ?? scene.parent ?? null,
    childCount: scene.children?.length ?? 0,
  };
};

export const projectChildOffset = (parent: BackendScene3D, child: BackendScene3D) => {
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

export const getSceneNodeCoordinates = (
  scene: BackendScene3D,
  parent?: BackendScene3D | null,
) => {
  if (normalizeLodLevel(scene.lodLevel) === 0 || !parent) {
    return {
      longitude: scene.position?.x ?? 0,
      latitude: scene.position?.y ?? 0,
      elevation: scene.position?.z ?? 0,
    };
  }

  return projectChildOffset(parent, scene);
};

export const mergeSceneRotation = (parent: BackendScene3D, child: BackendScene3D) => ({
  x: (parent.rotation?.x ?? 0) + (child.rotation?.x ?? 0),
  y: (parent.rotation?.y ?? 0) + (child.rotation?.y ?? 0),
  z: (parent.rotation?.z ?? 0) + (child.rotation?.z ?? 0),
});

export const createSceneBreadcrumb = (
  scene: BackendScene3D,
  parent?: BackendScene3D | null,
) => {
  if (!parent || normalizeLodLevel(scene.lodLevel) === 0) return scene.name;
  return `${parent.name} > ${scene.name}`;
};

export const sceneNodeToVirtualEntity = (
  scene: BackendScene3D,
  parent?: BackendScene3D | null,
  activeLodLevel?: SceneLodLevel,
): BackendSpatialEntity => {
  const coords = getSceneNodeCoordinates(scene, parent);
  const rotation =
    parent && normalizeLodLevel(scene.lodLevel) > 0
      ? mergeSceneRotation(parent, scene)
      : scene.rotation ?? { x: 0, y: 0, z: 0 };

  return {
    id: scene.id,
    name: scene.name,
    type: "scene_node",
    renderType: "3d_model",
    geometry: {
      type: "Point",
      coordinates: [coords.longitude, coords.latitude],
    },
    elevation: coords.elevation,
    scaleX: scene.scale?.x ?? 1,
    scaleY: scene.scale?.y ?? 1,
    scaleZ: scene.scale?.z ?? 1,
    rotationX: rotation.x ?? 0,
    rotationY: rotation.y ?? 0,
    rotationZ: rotation.z ?? 0,
    modelUrl: scene.fileUrl || null,
    metadata: {
      ...(scene.metadata ?? {}),
      activeLodLevel: activeLodLevel ?? normalizeLodLevel(scene.lodLevel),
      breadcrumb: createSceneBreadcrumb(scene, parent),
      childCount: scene.children?.length ?? 0,
      description: scene.description ?? `Scene LOD ${scene.lodLevel ?? 0}`,
      lodLevel: scene.lodLevel ?? 0,
      parentSceneId: parent?.id ?? scene.parent?.id ?? null,
      parentSceneName: parent?.name ?? scene.parent?.name ?? null,
    },
    sceneId: scene.id,
    scene,
    images: [],
  };
};
