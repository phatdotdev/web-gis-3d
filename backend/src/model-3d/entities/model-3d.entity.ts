import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SpatialEntity } from '../../spatial-entities/entities/spatial-entity.entity';

@Entity({ name: 'model_3d' })
export class Model3D {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true })
  assetUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  originalFilename!: string | null;

  @Column({ type: 'text', nullable: true })
  mimeType!: string | null;

  @Column({ type: 'bigint', nullable: true })
  fileSize!: number | null;

  @Column({ default: 'model' })
  category!: string;

  @Column({ type: 'text', nullable: true })
  thumbnailUrl!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  sceneServiceUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  arcgisItemId!: string | null;

  @Column({ default: 'none' })
  publishStatus!: 'none' | 'pending' | 'published' | 'failed';

  @Column({ default: 'scene' })
  sceneLayerType!: 'scene' | 'building';

  @Column({ type: 'jsonb', nullable: true })
  sceneSublayers!: Record<string, any>[] | null;

  @OneToMany(() => SpatialEntity, (entity) => entity.model)
  entities!: SpatialEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
