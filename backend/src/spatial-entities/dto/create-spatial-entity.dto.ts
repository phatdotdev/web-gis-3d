export class CreateSpatialEntityDto {
  layerId?: string | null;
  modelId?: string | null;
  sceneId?: string | null;
  name?: string;
  type!: string;
  renderType!: string;
  geometry!: string;
  elevation?: number;
  height?: number;
  width?: number;
  assetUrl?: string;
  iconUrl?: string;
  color?: string;
  opacity?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  modelUrl?: string;
  metadata?: Record<string, any>;
  images?: string[];
}
