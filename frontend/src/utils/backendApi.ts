import type {
  BackendLayer,
  BackendModel3D,
  BackendScene3D,
  BackendSpatialEntity,
} from "../types/backend";

export type LayerImportPreview = {
  name: string;
  type: "Point" | "LineString" | "Polygon";
  dataUrl: string;
  sourceType: "arcgis" | "geojson-url";
  featureCount: number;
  metadata: Record<string, unknown>;
  warnings: string[];
};

const rawBaseUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;

const normalizeHost = (value?: string) => {
  const trimmed = value?.replace(/\/$/, "");
  if (!trimmed) return "http://localhost:3000";
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
};

export const backendHost = normalizeHost(rawBaseUrl);

const normalizeBaseUrl = (value?: string) => {
  const trimmed = value?.replace(/\/$/, "");
  if (!trimmed) return "http://localhost:3000/api";
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

const baseUrl = normalizeBaseUrl(rawBaseUrl);

export const fetchLayers = async (signal?: AbortSignal) => {
  const response = await fetch(`${baseUrl}/layers`, { signal });
  if (!response.ok) {
    throw new Error("Failed to load layers");
  }
  return (await response.json()) as BackendLayer[];
};

export const previewLayerImport = async (sourceUrl: string) => {
  const response = await fetch(`${baseUrl}/layers/import/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceUrl }),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "Failed to preview layer import");
  }
  return (await response.json()) as LayerImportPreview;
};

export const createLayer = async (payload: Partial<BackendLayer>) => {
  const response = await fetch(`${baseUrl}/layers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to create layer");
  }
  return (await response.json()) as BackendLayer;
};

export const updateLayer = async (
  layerId: string,
  payload: Partial<BackendLayer>,
) => {
  const response = await fetch(`${baseUrl}/layers/${layerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to update layer");
  }
  return (await response.json()) as BackendLayer;
};

export const deleteLayer = async (layerId: string) => {
  const response = await fetch(`${baseUrl}/layers/${layerId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete layer");
  }
  return (await response.json()) as { deleted: boolean };
};

export const uploadLayerModel = async (layerId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${baseUrl}/layers/${layerId}/upload-model`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Failed to upload model");
  }
  return (await response.json()) as BackendLayer;
};

export const uploadLayerIcon = async (layerId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${baseUrl}/layers/${layerId}/upload-icon`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Failed to upload icon");
  }
  return (await response.json()) as BackendLayer;
};

export const uploadLayerGeoJson = async (
  file: File,
  payload: Partial<BackendLayer> = {},
) => {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(payload).forEach(([key, value]) => {
    if (value == null) return;
    formData.append(key, String(value));
  });
  const response = await fetch(`${baseUrl}/layers/upload-geojson`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Failed to upload geojson");
  }
  return (await response.json()) as BackendLayer;
};

export const updateSpatialEntity = async (
  entityId: string,
  payload: Partial<BackendSpatialEntity> & { layerId?: string | null },
) => {
  const response = await fetch(`${baseUrl}/spatial-entities/${entityId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to update entity");
  }
  return (await response.json()) as BackendSpatialEntity;
};

export const deleteSpatialEntity = async (entityId: string) => {
  const response = await fetch(`${baseUrl}/spatial-entities/${entityId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete entity");
  }
  return (await response.json()) as { deleted: boolean };
};

export const createSpatialEntity = async (
  payload: Partial<BackendSpatialEntity> & { layerId?: string | null },
) => {
  const response = await fetch(`${baseUrl}/spatial-entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to create entity");
  }
  return (await response.json()) as BackendSpatialEntity;
};

export const fetchSpatialEntities = async (
  layerId?: string,
  signal?: AbortSignal,
) => {
  const query = layerId ? `?layerId=${encodeURIComponent(layerId)}` : "";
  const response = await fetch(`${baseUrl}/spatial-entities${query}`, { signal });
  if (!response.ok) {
    throw new Error("Failed to load entities");
  }
  return (await response.json()) as BackendSpatialEntity[];
};

export const uploadEntityModel = async (entityId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(
    `${baseUrl}/spatial-entities/${entityId}/upload-model`,
    {
      method: "POST",
      body: formData,
    },
  );
  if (!response.ok) {
    throw new Error("Failed to upload entity model");
  }
  return (await response.json()) as BackendSpatialEntity;
};

export const fetchSpatialEntity = async (
  entityId: string,
  signal?: AbortSignal,
) => {
  const response = await fetch(`${baseUrl}/spatial-entities/${entityId}`, { signal });
  if (!response.ok) {
    throw new Error("Failed to load entity");
  }
  return (await response.json()) as BackendSpatialEntity;
};

export const uploadEntityImage = async (entityId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(
    `${baseUrl}/spatial-entities/${entityId}/upload-image`,
    {
      method: "POST",
      body: formData,
    },
  );
  if (!response.ok) {
    throw new Error("Failed to upload entity image");
  }
  return (await response.json()) as BackendSpatialEntity;
};

export const removeEntityImage = async (entityId: string, filename: string) => {
  const response = await fetch(
    `${baseUrl}/spatial-entities/${entityId}/images/${encodeURIComponent(filename)}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    throw new Error("Failed to remove entity image");
  }
  return (await response.json()) as BackendSpatialEntity;
};

export const fetchModels = async (signal?: AbortSignal) => {
  const response = await fetch(`${baseUrl}/models`, { signal });
  if (!response.ok) {
    throw new Error("Failed to load models");
  }
  return (await response.json()) as BackendModel3D[];
};

export const createModel = async (payload: Partial<BackendModel3D>) => {
  const response = await fetch(`${baseUrl}/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to create model");
  }
  return (await response.json()) as BackendModel3D;
};

export const updateModel = async (
  modelId: string,
  payload: Partial<BackendModel3D>,
) => {
  const response = await fetch(`${baseUrl}/models/${modelId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to update model");
  }
  return (await response.json()) as BackendModel3D;
};

export const deleteModel = async (modelId: string) => {
  const response = await fetch(`${baseUrl}/models/${modelId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete model");
  }
  return (await response.json()) as { deleted: boolean };
};

export const uploadModel = async (
  file: File,
  payload: Partial<BackendModel3D> = {},
) => {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(payload).forEach(([key, value]) => {
    if (value == null) return;
    formData.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  });
  const response = await fetch(`${baseUrl}/models/upload`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Failed to upload model");
  }
  return (await response.json()) as BackendModel3D;
};

export const replaceModelFile = async (modelId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${baseUrl}/models/${modelId}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Failed to replace model file");
  }
  return (await response.json()) as BackendModel3D;
};

export const fetchScenes = async (signal?: AbortSignal) => {
  const response = await fetch(`${baseUrl}/scenes`, { signal });
  if (!response.ok) {
    throw new Error("Failed to load scenes");
  }
  return (await response.json()) as BackendScene3D[];
};

export const fetchSceneById = async (id: string, signal?: AbortSignal) => {
  const response = await fetch(`${baseUrl}/scenes/${id}`, { signal });
  if (!response.ok) {
    throw new Error("Failed to load scene");
  }
  return (await response.json()) as BackendScene3D;
};



export const createScene = async (payload: Partial<BackendScene3D> & { parentId?: string | null }) => {
  const response = await fetch(`${baseUrl}/scenes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to create scene");
  }
  return (await response.json()) as BackendScene3D;
};

export const updateScene = async (
  sceneId: string,
  payload: Partial<BackendScene3D> & { parentId?: string | null },
) => {
  const response = await fetch(`${baseUrl}/scenes/${sceneId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to update scene");
  }
  return (await response.json()) as BackendScene3D;
};

export const deleteScene = async (sceneId: string) => {
  const response = await fetch(`${baseUrl}/scenes/${sceneId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete scene");
  }
  return (await response.json()) as { deleted: boolean };
};

export const fetchScenesByLod = async (lodLevel: number, signal?: AbortSignal) => {
  const response = await fetch(`${baseUrl}/scenes?lodLevel=${lodLevel}`, { signal });
  if (!response.ok) {
    throw new Error("Failed to load scenes by LOD");
  }
  return (await response.json()) as BackendScene3D[];
};

export const fetchSceneChildren = async (
  parentId: string,
  minLod?: number,
  signal?: AbortSignal,
) => {
  const query = minLod !== undefined ? `?minLod=${minLod}` : "";
  const response = await fetch(`${baseUrl}/scenes/${parentId}/children${query}`, { signal });
  if (!response.ok) {
    throw new Error("Failed to load scene children");
  }
  return (await response.json()) as BackendScene3D[];
};

export const updateSceneTransform = async (
  id: string,
  transform: {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
  },
) => {
  const response = await fetch(`${baseUrl}/scenes/${id}/transform`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transform),
  });
  if (!response.ok) {
    throw new Error("Failed to update scene transform");
  }
  return (await response.json()) as BackendScene3D;
};

export const uploadAndPlaceScene = async (
  file: File,
  name: string,
  placement: { longitude: number; latitude: number; elevation: number; heading: number; scale?: number },
  description?: string,
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name);
  formData.append("longitude", placement.longitude.toString());
  formData.append("latitude", placement.latitude.toString());
  formData.append("elevation", placement.elevation.toString());
  formData.append("heading", placement.heading.toString());
  if (placement.scale !== undefined) {
    formData.append("scale", placement.scale.toString());
  }
  if (description) {
    formData.append("description", description);
  }

  const response = await fetch(`${baseUrl}/scenes/upload-and-place`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload and place scene");
  }

  return (await response.json()) as BackendScene3D;
};

export const uploadAndSplitScene = async (
  file: File,
  name: string,
  description?: string,
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name);
  if (description) {
    formData.append("description", description);
  }
  const response = await fetch(`${baseUrl}/scenes/upload-and-split`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Failed to upload and split scene");
  }
  return (await response.json()) as BackendScene3D;
};

export const confirmScenePlacement = async (
  sceneId: string,
  placement: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
  },
) => {
  const response = await fetch(`${baseUrl}/scenes/${sceneId}/confirm-placement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(placement),
  });
  if (!response.ok) {
    throw new Error("Failed to confirm scene placement");
  }
  return (await response.json()) as BackendScene3D;
};
