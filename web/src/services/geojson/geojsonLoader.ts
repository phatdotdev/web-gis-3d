import type { GeojsonFeature, GeojsonFeatureCollection } from '../../types/geojson'
import { readGeojsonFile } from '../../utils/file/readGeojsonFile'

const supportedGeometryTypes = new Set([
  'Point',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon',
])

export function assertGeojsonFeatureCollection(input: unknown): GeojsonFeatureCollection {
  if (!isRecord(input) || input.type !== 'FeatureCollection' || !Array.isArray(input.features)) {
    throw new Error('GeoJSON phải có type FeatureCollection và features array.')
  }

  const features: GeojsonFeature[] = input.features
    .filter((feature): feature is GeojsonFeature => {
      if (!isRecord(feature) || feature.type !== 'Feature') {
        return false
      }
      if (!isRecord(feature.geometry) || !supportedGeometryTypes.has(String(feature.geometry.type))) {
        return false
      }
      return 'coordinates' in feature.geometry
    })
    .map((feature, index) => ({
      type: 'Feature',
      id: feature.id ?? `feature-${index + 1}`,
      geometry: feature.geometry,
      properties: isRecord(feature.properties) ? feature.properties : {},
    }))

  return {
    type: 'FeatureCollection',
    features,
    metadata: isRecord(input.metadata) ? input.metadata : undefined,
  }
}

export async function loadGeojsonFromLocalFile(path: string): Promise<GeojsonFeatureCollection> {
  if (path.startsWith('frontend-gis.upload.geojson.')) {
    const data = window.localStorage.getItem(path)
    if (!data) {
      throw new Error(`Không tìm thấy file upload trong bộ nhớ: ${path}`)
    }
    return assertGeojsonFeatureCollection(JSON.parse(data))
  }

  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Không tải được GeoJSON local: ${response.status} ${response.statusText}`)
  }
  return assertGeojsonFeatureCollection(await response.json())
}

export async function loadGeojsonFromRemoteUrl(url: string): Promise<GeojsonFeatureCollection> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Lỗi tải GeoJSON remote: ${response.status} ${response.statusText}`)
  }
  return assertGeojsonFeatureCollection(await response.json())
}

export async function loadGeojsonFromUploadedFile(file: File): Promise<GeojsonFeatureCollection> {
  return assertGeojsonFeatureCollection(await readGeojsonFile(file))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
