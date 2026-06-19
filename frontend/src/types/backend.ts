export type BackendLayer = {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  minZoom: number;
  maxZoom: number;
  zIndex: number;
  elevation?: number | null;
  scale?: number | null;
  height?: number | null;
  modelUrl?: string | null;
  iconUrl?: string | null;
  dataUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  entities: BackendSpatialEntity[];
  extent?: { xmin: number; ymin: number; xmax: number; ymax: number } | null;
  renderer?: any;
  popupTemplate?: any;
  featureCollection?: any;
  vertexFeatureCollection?: any;
  featureCollectionUrl?: string;
  vertexFeatureCollectionUrl?: string;
  dataStatus?: 'latest' | 'fallback';
  fallbackInfo?: {
    useFallbackData: boolean;
    reason?: string;
  } | null;
};

export type BackendModel3D = {
  id: string;
  name: string;
  description?: string | null;
  assetUrl?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  category?: string | null;
  thumbnailUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  sceneServiceUrl?: string | null;
  arcgisItemId?: string | null;
  publishStatus?: 'none' | 'pending' | 'published' | 'failed';
  sceneLayerType?: 'scene' | 'building';
  sceneSublayers?: Record<string, unknown>[] | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BackendScene3D = {
  id: string;
  name: string;
  description?: string | null;
  fileUrl?: string | null;
  lodLevel?: number;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  visible: boolean;
  sortOrder: number;
  parent?: { id: string; name?: string | null } | null;
  children?: BackendScene3D[];
  entities?: BackendSpatialEntity[];
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
};


export type BackendSpatialEntity = {
  id: string;
  name?: string | null;
  type: string;
  renderType: string;
  geometry: unknown;
  elevation?: number | null;
  height?: number | null;
  width?: number | null;
  scale?: number | null;
  scaleX?: number | null;
  scaleY?: number | null;
  scaleZ?: number | null;
  rotationX?: number | null;
  rotationY?: number | null;
  rotationZ?: number | null;
  modelUrl?: string | null;
  assetUrl?: string | null;
  iconUrl?: string | null;
  color?: string | null;
  opacity?: number | null;
  layer?: { id: string; name?: string | null } | null;
  model?: BackendModel3D | null;
  scene?: BackendScene3D | null;
  modelId?: string | null;
  sceneId?: string | null;
  metadata?: Record<string, unknown> | null;
  images?: string[];
};
