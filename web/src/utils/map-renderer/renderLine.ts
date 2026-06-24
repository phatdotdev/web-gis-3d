import Graphic from '@arcgis/core/Graphic'
import type { MapRenderContext, NormalizedSpatialFeature } from '../../types/map'
import { createCentroidPoint, createPolylineGeometry } from './geometryFactory'
import { createFeatureAttributes, indexFeatureSource } from './renderPoint'
import { createLineSymbol3D, createPinSymbol3D } from './symbolFactory'

/**
 * Render LineString/MultiLineString bằng 3D symbol trong SceneView.
 *
 * Dùng PathSymbol3DLayer (profile: "circle" → ống tròn, "quad" → khối vuông).
 * Line luôn có pin đại diện ở midpoint/centroid — click vào line hoặc pin
 * đều trigger inspector.
 */
export function renderLineFeature(ctx: MapRenderContext, feature: NormalizedSpatialFeature): Graphic[] {
  const lineGeometry = createPolylineGeometry(feature.geometryType, feature.coordinates)
  if (!lineGeometry) {
    return []
  }

  // Dùng 3D line symbol (PathSymbol3DLayer) cho SceneView
  const lineGraphic = new Graphic({
    geometry: lineGeometry,
    symbol: createLineSymbol3D(feature.style),
    attributes: createFeatureAttributes(feature),
  })
  const graphics = [lineGraphic]

  // Pin đại diện tại centroid
  if (feature.centroid) {
    graphics.push(
      new Graphic({
        geometry: createCentroidPoint(
          feature.centroid.longitude,
          feature.centroid.latitude,
          feature.centroid.z ?? feature.style.lineZ,
        ),
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
