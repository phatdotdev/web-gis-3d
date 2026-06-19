import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureProcessorService {
  private mapRenderType(geometryType: string): string {
    if (geometryType === 'Point' || geometryType === 'MultiPoint') {
      return 'point';
    }
    if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
      return 'line';
    }
    return 'polygon';
  }

  process(features: any[], layerConfig: {
    elevation?: number;
    scale?: number;
    height?: number;
    modelUrl?: string | null;
    iconUrl?: string | null;
  }): any[] {
    return features.map((feature, index) => {
      const properties = feature.properties ?? {};
      const geometryType = feature.geometry.type;

      const renderType = properties.renderType ?? this.mapRenderType(geometryType);
      const elevation = Number(properties.elevation ?? layerConfig.elevation ?? 0);
      const height = Number(properties.height ?? layerConfig.height ?? 0);
      const width = Number(properties.width ?? 1);
      const scale = Number(properties.scale ?? layerConfig.scale ?? 1);
      const opacity = Number(properties.opacity ?? 1);
      const color = properties.color ?? null;
      const assetUrl = properties.assetUrl ?? layerConfig.modelUrl ?? null;
      const iconUrl = properties.iconUrl ?? layerConfig.iconUrl ?? null;

      const processedProperties = {
        ...properties,
        name: properties.name ?? `feature_${index + 1}`,
        type: properties.type ?? geometryType.toLowerCase(),
        renderType,
        elevation,
        height,
        width,
        scale,
        opacity,
        color,
        assetUrl,
        iconUrl,
      };

      return {
        ...feature,
        id: feature.id ?? index + 1,
        properties: processedProperties,
      };
    });
  }
}
