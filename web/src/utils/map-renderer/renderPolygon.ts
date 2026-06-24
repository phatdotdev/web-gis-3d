import Graphic from '@arcgis/core/Graphic'
import type { MapRenderContext, NormalizedSpatialFeature } from '../../types/map'
import { createCentroidPoint, createPolygonGeometry } from './geometryFactory'
import { createFeatureAttributes, indexFeatureSource } from './renderPoint'
import { createPinSymbol3D, createPolygonSymbol } from './symbolFactory'

/**
 * Render Polygon/MultiPolygon — fill/outline/opacity như map 2D.
 * Pin đại diện tại centroid.
 */
export function renderPolygonFeature(ctx: MapRenderContext, feature: NormalizedSpatialFeature): Graphic[] {
  const polygonGeometry = createPolygonGeometry(feature.geometryType, feature.coordinates)
  if (!polygonGeometry) {
    return []
  }

  const polygonGraphic = new Graphic({
    geometry: polygonGeometry,
    symbol: createPolygonSymbol(feature.style),
    attributes: createFeatureAttributes(feature),
  })
  const graphics = [polygonGraphic]

  if (feature.centroid) {
    graphics.push(
      new Graphic({
        geometry: createCentroidPoint(feature.centroid.longitude, feature.centroid.latitude, feature.centroid.z),
        symbol: createPinSymbol3D(feature.style),
        attributes: {
          ...createFeatureAttributes(feature),
          appGraphicRole: 'centroid-pin',
        },
      }),
    )
  }

  ctx.graphicsLayer.addMany(graphics)

  // Index graphics
  ctx.graphicIndex.set(feature.id, graphics)
  indexFeatureSource(ctx, feature)

  return graphics
}
