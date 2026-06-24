import { defaultModel3D, defaultSpatialStyle } from '../../constants/defaultSymbols'
import type { GeojsonFeatureCollection } from '../../types/geojson'
import type { LayerConfig } from '../../types/layer'
import type {
  GeometryType,
  NormalizedSpatialFeature,
  ResolvedSpatialStyle,
  SpatialPosition,
  SpatialStyle,
} from '../../types/map'
import type { Model3DConfig, ResolvedModel3DConfig } from '../../types/model3d'
import type { SpatialEntityConfig } from '../../types/spatialEntity'

export function normalizeLayerGeojson(
  layer: LayerConfig,
  geojson: GeojsonFeatureCollection,
): NormalizedSpatialFeature[] {
  return geojson.features
    .filter((feature) => feature.geometry !== null)
    .map((feature, index) => {
      const geometry = feature.geometry
      if (!geometry) {
        throw new Error('Feature đã được filter nhưng geometry vẫn null.')
      }
      const featureId = `${layer.layerId}:${String(feature.id ?? index + 1)}`
      const properties = feature.properties ?? {}

      return {
        id: featureId,
        sourceType: 'layer',
        layerId: layer.layerId,
        name: resolveFeatureName(properties, featureId),
        geometryType: geometry.type,
        coordinates: geometry.coordinates,
        centroid: computeCentroid(geometry.type, geometry.coordinates),
        properties,
        metadata: { ...geojson.metadata, ...layer.metadata },
        style: resolveStyle(layer.style),
        model3D: resolveModel3D(layer.model3D),
      }
    })
}

export function normalizeSpatialEntity(entity: SpatialEntityConfig): NormalizedSpatialFeature {
  return {
    id: entity.entityId,
    sourceType: 'entity',
    entityId: entity.entityId,
    name: entity.entityName,
    geometryType: entity.geometry.type,
    coordinates: entity.geometry.coordinates,
    centroid: entity.position ?? computeCentroid(entity.geometry.type, entity.geometry.coordinates),
    properties: {
      description: entity.description ?? '',
    },
    metadata: entity.metadata,
    style: resolveStyle(entity.style),
    model3D: resolveModel3D(entity.model3D),
  }
}

export function resolveStyle(style: SpatialStyle): ResolvedSpatialStyle {
  return {
    ...defaultSpatialStyle,
    ...style,
  }
}

export function resolveModel3D(model3D?: Model3DConfig): ResolvedModel3DConfig {
  return {
    ...defaultModel3D,
    ...model3D,
    enabled: model3D?.enabled ?? false,
  }
}

function resolveFeatureName(properties: Record<string, unknown>, id: string): string {
  const candidates = [
    properties.TenLoaiCay,
    properties.tenHuyen,
    properties.Ten,
    properties.Name,
    properties.OBJECTID,
  ]
  const value = candidates.find((candidate) => candidate !== undefined && candidate !== null && String(candidate).trim())
  return value ? String(value) : `Feature ${id}`
}

function computeCentroid(geometryType: GeometryType, coordinates: unknown): SpatialPosition | undefined {
  const points = flattenCoordinatePairs(geometryType, coordinates)
  if (points.length === 0) {
    return undefined
  }

  if (geometryType === 'Point') {
    return toPosition(points[0])
  }

  const total = points.reduce(
    (sum, point) => ({
      longitude: sum.longitude + point[0],
      latitude: sum.latitude + point[1],
      z: sum.z + (point[2] ?? 0),
    }),
    { longitude: 0, latitude: 0, z: 0 },
  )

  return {
    longitude: total.longitude / points.length,
    latitude: total.latitude / points.length,
    z: total.z / points.length,
  }
}

function flattenCoordinatePairs(geometryType: GeometryType, coordinates: unknown): number[][] {
  if (geometryType === 'Point') {
    return isNumberTuple(coordinates) ? [coordinates] : []
  }

  if (geometryType === 'LineString') {
    return readLine(coordinates)
  }

  if (geometryType === 'MultiLineString') {
    return Array.isArray(coordinates) ? coordinates.flatMap(readLine) : []
  }

  if (geometryType === 'Polygon') {
    return readPolygon(coordinates)
  }

  if (geometryType === 'MultiPolygon') {
    return Array.isArray(coordinates) ? coordinates.flatMap(readPolygon) : []
  }

  return []
}

function readLine(value: unknown): number[][] {
  return Array.isArray(value) ? value.filter(isNumberTuple) : []
}

function readPolygon(value: unknown): number[][] {
  if (!Array.isArray(value)) {
    return []
  }
  return readLine(value[0])
}

function isNumberTuple(value: unknown): value is number[] {
  return Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number'
}

function toPosition(point: number[]): SpatialPosition {
  return {
    longitude: point[0],
    latitude: point[1],
    z: point[2],
  }
}
