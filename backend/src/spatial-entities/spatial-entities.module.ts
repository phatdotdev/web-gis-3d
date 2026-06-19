import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpatialEntitiesService } from './spatial-entities.service';
import { SpatialEntitiesController } from './spatial-entities.controller';
import { SpatialEntity } from './entities/spatial-entity.entity';
import { Layer } from '../layers/entities/layer.entity';
import { Model3D } from '../model-3d/entities/model-3d.entity';
import { Scene3D } from '../scenes/entities/scene-3d.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SpatialEntity, Layer, Model3D, Scene3D])],
  controllers: [SpatialEntitiesController],
  providers: [SpatialEntitiesService],
})
export class SpatialEntitiesModule {}
