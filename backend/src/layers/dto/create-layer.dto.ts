export class CreateLayerDto {
  name!: string;
  type!: string;
  visible?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zIndex?: number;
  metadata?: Record<string, any>;
  elevation?: number;
  scale?: number;
  height?: number;
  modelUrl?: string;
  iconUrl?: string;
  dataUrl?: string;
}

