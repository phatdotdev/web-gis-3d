import type { Model3DConfig, ResolvedModel3DConfig } from './model3d'
import type Graphic from '@arcgis/core/Graphic'
import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import type SceneView from '@arcgis/core/views/SceneView'

export type GeometryType =
  | 'Point'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon'

export type LayerGeometryType = 'Point' | 'LineString' | 'Polygon' | 'Mixed'

export type SpatialSourceType = 'layer' | 'entity'

export type LineProfile = 'circle' | 'quad'

export type SpatialStyle = {
  pinColor?: string
  pinIcon?: string
  lineColor?: string
  lineWidth?: number
  lineHeight?: number
  lineProfile?: LineProfile
  lineZ?: number
  lineCap?: 'round' | 'square'
  polygonFillColor?: string
  polygonOutlineColor?: string
  polygonOpacity?: number
}

export type ResolvedSpatialStyle = Required<
  Pick<SpatialStyle, 'pinColor' | 'lineColor' | 'lineWidth' | 'lineHeight' | 'lineProfile' | 'lineZ' | 'polygonFillColor' | 'polygonOutlineColor' | 'polygonOpacity'>
> &
  Pick<SpatialStyle, 'pinIcon' | 'lineCap'>

export type SpatialPosition = {
  longitude: number
  latitude: number
  z?: number
}

export type NormalizedSpatialFeature = {
  id: string
  sourceType: SpatialSourceType
  layerId?: string
  entityId?: string
  name: string
  geometryType: GeometryType
  coordinates: unknown
  centroid?: SpatialPosition
  properties: Record<string, unknown>
  metadata?: Record<string, unknown>
  style: ResolvedSpatialStyle
  model3D?: ResolvedModel3DConfig
}

export type MapSettings = {
  center: SpatialPosition
  tilt: number
  heading: number
  basemap: string
  ground: string
}

/** Render context shared by layer and entity graphics */
export type MapRenderContext = {
  view: SceneView
  graphicsLayer: GraphicsLayer
  modelLayer: GraphicsLayer
  highlightLayer?: GraphicsLayer
  /** featureId → Graphic[] */
  graphicIndex: Map<string, Graphic[]>
  /** layerId → Set<featureId> */
  layerFeatureIndex: Map<string, Set<string>>
  /** entityId → Set<featureId> */
  entityFeatureIndex: Map<string, Set<string>>
}

export type RenderResult = {
  rendered: number
  graphics: number
}

export type InspectorFeature = NormalizedSpatialFeature & {
  layerName?: string
}

export type RenderableConfig = {
  style: SpatialStyle
  model3D?: Model3DConfig
}
