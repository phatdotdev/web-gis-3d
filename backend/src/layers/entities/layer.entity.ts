import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SpatialEntity } from '../../spatial-entities/entities/spatial-entity.entity';

@Entity()
export class Layer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column()
  type!: string;

  @Column({ default: true })
  visible!: boolean;

  @Column({ default: 0 })
  minZoom!: number;

  @Column({ default: 24 })
  maxZoom!: number;

  @Column({ default: 0 })
  zIndex!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any>;

  @Column({ type: 'double precision', default: 0 })
  elevation!: number;

  @Column({ type: 'double precision', default: 1 })
  scale!: number;


  @Column({ type: 'double precision', default: 0 })
  height!: number;

  @Column({ type: 'jsonb', nullable: true })
  extent!: { xmin: number; ymin: number; xmax: number; ymax: number } | null;

  @Column({ type: 'jsonb', nullable: true })
  renderCache!: {
    renderer: any;
    popupTemplate: any;
    featureCollection: any;
    vertexFeatureCollection?: any;
  } | null;

  @Column({ type: 'text', nullable: true })
  modelUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  iconUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  dataUrl!: string | null;

  @OneToMany(() => SpatialEntity, (entity) => entity.layer)
  entities!: SpatialEntity[];
}

