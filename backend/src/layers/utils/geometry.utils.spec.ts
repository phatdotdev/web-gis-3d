import { mapGeoJsonGeometryToLayerType } from './geometry.utils';

describe('mapGeoJsonGeometryToLayerType', () => {
  it('maps point-like geometries to Point', () => {
    expect(mapGeoJsonGeometryToLayerType('Point')).toBe('Point');
    expect(mapGeoJsonGeometryToLayerType('MultiPoint')).toBe('Point');
  });

  it('maps line-like geometries to LineString', () => {
    expect(mapGeoJsonGeometryToLayerType('LineString')).toBe('LineString');
    expect(mapGeoJsonGeometryToLayerType('MultiLineString')).toBe('LineString');
  });

  it('maps polygon-like geometries to Polygon', () => {
    expect(mapGeoJsonGeometryToLayerType('Polygon')).toBe('Polygon');
    expect(mapGeoJsonGeometryToLayerType('MultiPolygon')).toBe('Polygon');
  });
});
