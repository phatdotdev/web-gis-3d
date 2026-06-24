import type { LayerGeometryType, SpatialStyle } from './map'
import type { Model3DConfig } from './model3d'

export type LayerSourceType = 'local-geojson' | 'remote-geojson' | 'arcgis-query-url'

export type LayerConfig = {
  layerId: string
  layerName: string
  description?: string
  sourceType: LayerSourceType
  geojsonUrl?: string
  geojsonFile?: string
  geometryType?: LayerGeometryType
  visible: boolean
  style: SpatialStyle
  model3D?: Model3DConfig
  metadata?: Record<string, unknown>
}
