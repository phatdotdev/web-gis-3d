import { BadRequestException } from '@nestjs/common';
import { GeoJsonParserService } from './geojson-parser.service';
import { GeometryValidatorService } from './geometry-validator.service';

describe('GeoJsonParserService', () => {
  const parser = new GeoJsonParserService();

  it('parses a valid FeatureCollection from a buffer', () => {
    const input = Buffer.from(
      JSON.stringify({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [105.55, 10.18] },
            properties: { OBJECTID: 1 },
          },
        ],
      }),
    );

    expect(parser.parse(input).features).toHaveLength(1);
  });

  it('rejects non-FeatureCollection GeoJSON', () => {
    expect(() => parser.parse({ type: 'Feature', geometry: null })).toThrow(
      BadRequestException,
    );
  });
});

describe('GeometryValidatorService', () => {
  const validator = new GeometryValidatorService();

  it('keeps supported GeoJSON geometry types', () => {
    const features = [
      { geometry: { type: 'Point', coordinates: [1, 2] } },
      { geometry: { type: 'MultiPoint', coordinates: [[1, 2]] } },
      { geometry: { type: 'LineString', coordinates: [[1, 2], [3, 4]] } },
      { geometry: { type: 'MultiLineString', coordinates: [[[1, 2], [3, 4]]] } },
      { geometry: { type: 'Polygon', coordinates: [[[1, 2], [3, 4], [1, 2]]] } },
      { geometry: { type: 'MultiPolygon', coordinates: [[[[1, 2], [3, 4], [1, 2]]]] } },
    ];

    expect(validator.validateAndFilter(features)).toHaveLength(6);
  });
});
