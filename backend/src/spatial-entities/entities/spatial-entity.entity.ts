import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Layer } from '../../layers/entities/layer.entity';
import { Model3D } from '../../model-3d/entities/model-3d.entity';
import { Scene3D } from '../../scenes/entities/scene-3d.entity';

@Entity()
export class SpatialEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ nullable: true })
  name!: string;
  @Column()
  type!: string;
  @Column()
  renderType!: string;
  @Column({ type: 'geometry', spatialFeatureType: 'Geometry', srid: 4326 })
  geometry!: any;
  @Column({ type: 'double precision', default: 0 })
  elevation!: number;
  @Column({ type: 'double precision', default: 0 })
  height!: number;
  @Column({ type: 'double precision', default: 1 })
  width!: number;
  @Column({ nullable: true })
  assetUrl!: string;
  @Column({ nullable: true })
  iconUrl!: string;
  @Column({ nullable: true })
  color!: string;
  @Column({ type: 'double precision', default: 1 })
  opacity!: number;
  @Column({ type: 'double precision', default: 1 })
  scaleX!: number;
  @Column({ type: 'double precision', default: 1 })
  scaleY!: number;
  @Column({ type: 'double precision', default: 1 })
  scaleZ!: number;
  @Column({ type: 'double precision', default: 0 })
  rotationX!: number;
  @Column({ type: 'double precision', default: 0 })
  rotationY!: number;
  @Column({ type: 'double precision', default: 0 })
  rotationZ!: number;
  @Column({ type: 'text', nullable: true })
  modelUrl!: string | null;
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any>;
  @Column({ type: 'jsonb', default: [] })
  images!: string[];
  @ManyToOne(() => Layer, (layer) => layer.entities, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'layer_id' })
  layer!: Layer | null;

  @ManyToOne(() => Model3D, (model) => model.entities, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'model_id' })
  model!: Model3D | null;

  @ManyToOne(() => Scene3D, (scene) => scene.entities, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scene_id' })
  scene!: Scene3D | null;
}
