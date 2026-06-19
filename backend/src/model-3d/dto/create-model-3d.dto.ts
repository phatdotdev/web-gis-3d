export class CreateModel3DDto {
  name!: string;
  description?: string | null;
  assetUrl?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  category?: string;
  thumbnailUrl?: string | null;
  metadata?: Record<string, any> | null;
  sceneServiceUrl?: string | null;
  arcgisItemId?: string | null;
  publishStatus?: 'none' | 'pending' | 'published' | 'failed';
  sceneLayerType?: 'scene' | 'building';
  sceneSublayers?: Record<string, any>[] | null;
}
