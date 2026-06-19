import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scene3D } from './entities/scene-3d.entity';
import { SpatialEntity } from '../spatial-entities/entities/spatial-entity.entity';
import { ScenesController } from './scenes.controller';
import { ScenesService } from './scenes.service';
import { ModelProcessorService } from './model-processor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Scene3D, SpatialEntity])],
  controllers: [ScenesController],
  providers: [ScenesService, ModelProcessorService],
})
export class ScenesModule {}
