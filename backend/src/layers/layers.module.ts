import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LayersService } from './layers.service';
import { LayersController } from './layers.controller';
import { Layer } from './entities/layer.entity';
import { SpatialEntity } from '../spatial-entities/entities/spatial-entity.entity';
import { Model3D } from '../model-3d/entities/model-3d.entity';
import { GeoJsonDownloaderService } from './services/geojson-downloader.service';
import { GeoJsonParserService } from './services/geojson-parser.service';
import { GeometryValidatorService } from './services/geometry-validator.service';
import { FeatureProcessorService } from './services/feature-processor.service';
import { RenderDataGeneratorService } from './services/render-data-generator.service';
import { GeoJsonPipelineService } from './services/geojson-pipeline.service';
import { LayerImportService } from './services/layer-import.service';

@Module({
  imports: [TypeOrmModule.forFeature([Layer, SpatialEntity, Model3D])],
  controllers: [LayersController],
  providers: [
    LayersService,
    GeoJsonDownloaderService,
    GeoJsonParserService,
    GeometryValidatorService,
    FeatureProcessorService,
    RenderDataGeneratorService,
    GeoJsonPipelineService,
    LayerImportService,
  ],
})
export class LayersModule {}

