import { Injectable } from '@nestjs/common';

@Injectable()
export class GeometryValidatorService {
  private readonly allowedTypes = new Set([
    'Point',
    'LineString',
    'Polygon',
    'MultiPoint',
    'MultiLineString',
    'MultiPolygon',
  ]);

  validateAndFilter(features: any[]): any[] {
    return features.filter((feature) => {
      const geometry = feature?.geometry;
      if (!geometry || !geometry.type || !geometry.coordinates) {
        return false;
      }
      return this.allowedTypes.has(geometry.type);
    });
  }
}
