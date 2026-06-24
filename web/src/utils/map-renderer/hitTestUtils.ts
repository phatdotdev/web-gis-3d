export function readFeatureIdFromHitTest(result: unknown): string | null {
  if (!isRecord(result) || !Array.isArray(result.results)) {
    return null
  }

  const graphicHit = result.results.find((hit) => isRecord(hit) && 'graphic' in hit)
  const graphic = isRecord(graphicHit) && isRecord(graphicHit.graphic) ? graphicHit.graphic : null
  const attributes = graphic && isRecord(graphic.attributes) ? graphic.attributes : undefined
  return typeof attributes?.appFeatureId === 'string' ? attributes.appFeatureId : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
