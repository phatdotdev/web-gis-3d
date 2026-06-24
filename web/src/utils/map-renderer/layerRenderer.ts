import Graphic from '@arcgis/core/Graphic'
import type { MapRenderContext, NormalizedSpatialFeature, RenderResult } from '../../types/map'
import { chunkedRender } from '../performance/chunkedRender'
import { clearMapGraphics } from './clearMapGraphics'
import { renderLineFeature } from './renderLine'
import { renderPointFeature } from './renderPoint'
import { renderPolygonFeature } from './renderPolygon'
import { createHighlightSymbol } from './symbolFactory'

export async function renderSpatialFeatures(
  ctx: MapRenderContext,
  features: NormalizedSpatialFeature[],
  options?: {
    clearBeforeRender?: boolean
    chunkSize?: number
    onProgress?: (rendered: number, total: number) => void
  },
): Promise<RenderResult> {
  if (options?.clearBeforeRender) {
    clearMapGraphics(ctx)
  }

  let graphicsCount = 0
  await chunkedRender(
    features,
    options?.chunkSize ?? 250,
    (feature) => {
      graphicsCount += renderFeature(ctx, feature).length
    },
    options?.onProgress,
  )

  return {
    rendered: features.length,
    graphics: graphicsCount,
  }
}

export function renderFeature(ctx: MapRenderContext, feature: NormalizedSpatialFeature): Graphic[] {
  if (feature.geometryType === 'Point') {
    return renderPointFeature(ctx, feature)
  }

  if (feature.geometryType === 'LineString' || feature.geometryType === 'MultiLineString') {
    return renderLineFeature(ctx, feature)
  }

  return renderPolygonFeature(ctx, feature)
}

export function highlightFeature(ctx: MapRenderContext, feature: NormalizedSpatialFeature): void {
  ctx.highlightLayer?.removeAll()
  const graphics = ctx.graphicIndex.get(feature.id)
  if (!graphics || !ctx.highlightLayer) {
    return
  }

  const highlightGraphics = graphics
    .filter((graphic) => graphic.geometry)
    .map(
      (graphic) =>
        new Graphic({
          geometry: graphic.geometry,
          symbol: createHighlightSymbol(feature),
          attributes: graphic.attributes,
        }),
    )

  ctx.highlightLayer.addMany(highlightGraphics)
}

export function clearHighlight(ctx: MapRenderContext): void {
  ctx.highlightLayer?.removeAll()
}

export async function zoomToFeature(ctx: MapRenderContext, featureId: string): Promise<void> {
  const graphics = ctx.graphicIndex.get(featureId)
  if (!graphics || graphics.length === 0) {
    return
  }

  await ctx.view.goTo(graphics, {
    duration: 600,
  })
}
