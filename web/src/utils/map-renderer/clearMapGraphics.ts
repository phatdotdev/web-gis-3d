import type { MapRenderContext, SpatialSourceType } from '../../types/map'

export function clearMapGraphics(ctx: MapRenderContext): void {
  ctx.graphicsLayer.removeAll()
  ctx.modelLayer.removeAll()
  ctx.highlightLayer?.removeAll()
  ctx.graphicIndex.clear()
  ctx.layerFeatureIndex.clear()
  ctx.entityFeatureIndex.clear()
}

/**
 * Xóa graphics theo source (layer hoặc entity) — không clear toàn bộ map,
 * chỉ remove graphics của source đó. Dùng index để O(n) theo feature thay vì
 * duyệt toàn bộ graphicIndex.
 */
export function removeFeaturesBySource(
  ctx: MapRenderContext,
  sourceType: SpatialSourceType,
  sourceId: string,
): void {
  const featureIndex = sourceType === 'layer' ? ctx.layerFeatureIndex : ctx.entityFeatureIndex
  const featureIds = featureIndex.get(sourceId)
  if (!featureIds) {
    return
  }

  featureIds.forEach((featureId) => {
    const graphics = ctx.graphicIndex.get(featureId)
    if (graphics) {
      graphics.forEach((graphic) => {
        ctx.graphicsLayer.remove(graphic)
        ctx.modelLayer.remove(graphic)
        ctx.highlightLayer?.remove(graphic)
      })
      ctx.graphicIndex.delete(featureId)
    }
  })

  featureIndex.delete(sourceId)
}

/**
 * Remove graphics cho 1 feature cụ thể
 */
export function removeFeatureGraphics(ctx: MapRenderContext, featureId: string): void {
  const graphics = ctx.graphicIndex.get(featureId)
  if (graphics) {
    graphics.forEach((graphic) => {
      ctx.graphicsLayer.remove(graphic)
      ctx.modelLayer.remove(graphic)
      ctx.highlightLayer?.remove(graphic)
    })
    ctx.graphicIndex.delete(featureId)
  }
}

export function setFeatureVisibility(ctx: MapRenderContext, featureIds: string[], visible: boolean): void {
  featureIds.forEach((featureId) => {
    ctx.graphicIndex.get(featureId)?.forEach((graphic) => {
      graphic.visible = visible
    })
  })
}
