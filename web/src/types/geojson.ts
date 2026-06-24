import type { GeometryType } from './map'

export type GeojsonGeometry = {
  type: GeometryType
  coordinates: unknown
}

export type GeojsonFeature = {
  type: 'Feature'
  id?: string | number
  geometry: GeojsonGeometry | null
  properties?: Record<string, unknown> | null
}

export type GeojsonFeatureCollection = {
  type: 'FeatureCollection'
  features: GeojsonFeature[]
  metadata?: Record<string, unknown>
}

export type GeojsonLoadResult = {
  collection: GeojsonFeatureCollection
  skippedFeatures: number
}
