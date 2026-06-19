export class LayerResponseDto {
  id!: string;
  name!: string;
  type!: string;
  visible!: boolean;
  minZoom!: number;
  maxZoom!: number;
  zIndex!: number;
  elevation!: number;
  scale!: number;
  height!: number;
  modelUrl!: string | null;
  iconUrl!: string | null;
  dataUrl!: string | null;
  metadata!: Record<string, any> | null;

  extent!: { xmin: number; ymin: number; xmax: number; ymax: number } | null;
  renderer!: any;
  popupTemplate!: any;
  featureCollection?: any;
  vertexFeatureCollection?: any;
  featureCollectionUrl?: string;
  vertexFeatureCollectionUrl?: string;
  entities!: any[];

  dataStatus!: 'latest' | 'fallback';
  fallbackInfo?: {
    useFallbackData: boolean;
    reason?: string;
  };
}
