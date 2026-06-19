import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SpatialEntity } from '../../spatial-entities/entities/spatial-entity.entity';

@Entity({ name: 'scene_3d' })
export class Scene3D {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ default: true })
  visible!: boolean;

  @Column({ default: 0 })
  sortOrder!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: 'varchar', nullable: true })
  fileUrl!: string | null;

  @Column({ type: 'int', default: 0 })
  lodLevel!: number;

  @Column({ type: 'jsonb', default: { x: 0, y: 0, z: 0 } })
  position!: { x: number; y: number; z: number };

  @Column({ type: 'jsonb', default: { x: 0, y: 0, z: 0 } })
  rotation!: { x: number; y: number; z: number };

  @Column({ type: 'jsonb', default: { x: 1, y: 1, z: 1 } })
  scale!: { x: number; y: number; z: number };

  @ManyToOne(() => Scene3D, (scene) => scene.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: Scene3D | null;

  @OneToMany(() => Scene3D, (scene) => scene.parent, { cascade: true })
  children!: Scene3D[];

  @OneToMany(() => SpatialEntity, (entity) => entity.scene)
  entities!: SpatialEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
