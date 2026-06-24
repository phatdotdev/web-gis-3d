import Graphic from '@arcgis/core/Graphic'
import type { MapRenderContext, NormalizedSpatialFeature } from '../../types/map'
import { createPointGeometry } from './geometryFactory'
import { createModelSymbol3D, createPinSymbol3D } from './symbolFactory'

/**
 * Render Point feature:
 * - Pin 3D đẹp (IconSymbol3DLayer + callout) trên SceneView.
 * - Nếu có model3D enabled và modelUrl → thêm graphic model GLB.
 * - Nếu model lỗi thì chỉ hiện pin.
 * - z mặc định = 0.
 */
export function renderPointFeature(ctx: MapRenderContext, feature: NormalizedSpatialFeature): Graphic[] {
  const altitudeOffset = feature.model3D?.altitudeOffset ?? 0
  const geometry = createPointGeometry(feature.coordinates, altitudeOffset)
  if (!geometry) {
    return []
  }

  const pinGraphic = new Graphic({
    geometry,
    symbol: createPinSymbol3D(feature.style),
    attributes: createFeatureAttributes(feature),
  })
  const graphics = [pinGraphic]

  if (feature.model3D?.enabled) {
    const modelSymbol = createModelSymbol3D(feature.model3D)
    if (modelSymbol) {
      graphics.push(
        new Graphic({
          geometry,
          symbol: modelSymbol,
          attributes: {
            ...createFeatureAttributes(feature),
            appGraphicRole: 'model',
          },
        }),
      )
    } else {
      console.warn(`[map-renderer] Model 3D "${feature.name}" is enabled but modelUrl is missing.`, {
        featureId: feature.id,
        sourceType: feature.sourceType,
        layerId: feature.layerId,
        entityId: feature.entityId,
      })
    }
  } else if (feature.model3D?.modelUrl && feature.model3D.modelUrl !== '/data/models/default-point.glb') {
    console.warn(`[map-renderer] Model 3D "${feature.name}" has modelUrl but model3D.enabled is false.`, {
      featureId: feature.id,
      sourceType: feature.sourceType,
      modelUrl: feature.model3D.modelUrl,
    })
  }

  ctx.graphicsLayer.add(pinGraphic)
  if (graphics.length > 1) {
    ctx.modelLayer.addMany(graphics.slice(1))
  }

  // Index graphics
  ctx.graphicIndex.set(feature.id, graphics)
  indexFeatureSource(ctx, feature)

  return graphics
}

export function createFeatureAttributes(feature: NormalizedSpatialFeature): Record<string, unknown> {
  return {
    appFeatureId: feature.id,
    appFeatureName: feature.name,
    sourceType: feature.sourceType,
    layerId: feature.layerId,
    entityId: feature.entityId,
    geometryType: feature.geometryType,
    originalProperties: feature.properties,
  }
}

/** Thêm featureId vào layer/entity index */
export function indexFeatureSource(ctx: MapRenderContext, feature: NormalizedSpatialFeature): void {
  if (feature.layerId) {
    if (!ctx.layerFeatureIndex.has(feature.layerId)) {
      ctx.layerFeatureIndex.set(feature.layerId, new Set())
    }
    ctx.layerFeatureIndex.get(feature.layerId)!.add(feature.id)
  }
  if (feature.entityId) {
    if (!ctx.entityFeatureIndex.has(feature.entityId)) {
      ctx.entityFeatureIndex.set(feature.entityId, new Set())
    }
    ctx.entityFeatureIndex.get(feature.entityId)!.add(feature.id)
  }
}
