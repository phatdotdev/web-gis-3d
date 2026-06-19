export class CreateSceneDto {
  name!: string;
  description?: string | null;
  fileUrl?: string | null;
  lodLevel?: number;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  visible?: boolean;
  sortOrder?: number;
  parentId?: string | null;
  metadata?: Record<string, any> | null;
}
