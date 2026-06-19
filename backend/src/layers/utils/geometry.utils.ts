export type LayerGeometryType = 'Point' | 'LineString' | 'Polygon';

export function mapGeoJsonGeometryToLayerType(
  geometryType?: string | null,
): LayerGeometryType {
  if (geometryType === 'Point' || geometryType === 'MultiPoint') {
    return 'Point';
  }
  if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
    return 'LineString';
  }
  return 'Polygon';
}

export function mapEsriGeometryToGeoJsonType(
  geometryType?: string | null,
): string | null {
  const normalized = geometryType?.toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('point')) return 'Point';
  if (normalized.includes('polyline')) return 'LineString';
  if (normalized.includes('polygon')) return 'Polygon';
  return null;
}

export function isWgs84SpatialReference(spatialReference: any): boolean {
  if (!spatialReference) return true;
  const wkid = spatialReference.wkid ?? spatialReference.latestWkid;
  if (wkid === 4326) return true;

  const wkt = String(spatialReference.wkt ?? '').toLowerCase();
  return wkt.includes('wgs_1984') || wkt.includes('wgs 84');
}
