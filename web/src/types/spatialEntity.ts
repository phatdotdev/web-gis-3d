import type { GeometryType, SpatialPosition, SpatialStyle } from './map'
import type { Model3DConfig } from './model3d'

export type SpatialEntityGeometry = {
  type: Extract<GeometryType, 'Point' | 'LineString' | 'Polygon'>
  coordinates: unknown
}

export type SpatialEntityConfig = {
  entityId: string
  entityName: string
  description?: string
  geometry: SpatialEntityGeometry
  position?: SpatialPosition
  visible: boolean
  style: SpatialStyle
  model3D?: Model3DConfig
  metadata?: Record<string, unknown>
}
