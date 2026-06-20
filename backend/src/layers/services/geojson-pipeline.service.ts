import { Injectable } from '@nestjs/common';
import { GeoJsonParserService } from './geojson-parser.service';
import { GeometryValidatorService } from './geometry-validator.service';
import { FeatureProcessorService } from './feature-processor.service';
import { RenderDataGeneratorService } from './render-data-generator.service';

export interface PipelineResult {
  featureCollection: any;
  extent: { xmin: number; ymin: number; xmax: number; ymax: number } | null;
  renderer: any;
  popupTemplate: any;
  vertexFeatureCollection?: any;
}

@Injectable()
export class GeoJsonPipelineService {
  constructor(
    private readonly parser: GeoJsonParserService,
    private readonly validator: GeometryValidatorService,
    private readonly processor: FeatureProcessorService,
    private readonly renderGenerator: RenderDataGeneratorService,
  ) {}

  process(
    geoJsonInput: any,
    layerConfig: {
      elevation?: number;
      scale?: number;
      height?: number;
      modelUrl?: string | null;
      iconUrl?: string | null;
    },
  ): PipelineResult {
    const rawCollection = this.parser.parse(geoJsonInput);
    const filteredFeatures = this.validator.validateAndFilter(rawCollection.features);
    const processedFeatures = this.processor.process(filteredFeatures, layerConfig);

    const extent = this.renderGenerator.calculateExtent(processedFeatures);
    
    const representative = processedFeatures[0];
    const geometryType = representative?.geometry?.type ?? 'Point';
    const representativeProperties = representative?.properties ?? {};

    const renderer = this.renderGenerator.buildRenderer(
      geometryType,
      representativeProperties,
      processedFeatures,
    );
    const popupTemplate = this.renderGenerator.buildPopupTemplate(processedFeatures);

    const featureCollection = {
      type: 'FeatureCollection',
      features: processedFeatures,
    };

    const result: PipelineResult = {
      featureCollection,
      extent,
      renderer,
      popupTemplate,
    };

    result.vertexFeatureCollection = this.renderGenerator.buildVertexCollection(processedFeatures);

    return result;
  }
}
