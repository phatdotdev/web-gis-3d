import type { GeojsonFeatureCollection } from '../../types/geojson'
import { loadGeojsonFromLocalFile, loadGeojsonFromRemoteUrl } from './geojsonLoader'

const geojsonCache = new Map<string, GeojsonFeatureCollection>()

export function buildArcgisGeojsonQueryUrl(baseUrl: string): string {
  const url = new URL(baseUrl)
  url.searchParams.set('where', url.searchParams.get('where') ?? '1=1')
  url.searchParams.set('outFields', url.searchParams.get('outFields') ?? '*')
  url.searchParams.set('f', 'geojson')
  url.searchParams.set('returnGeometry', url.searchParams.get('returnGeometry') ?? 'true')
  return url.toString()
}

export async function loadGeojsonForSource(sourceKey: string, url: string): Promise<GeojsonFeatureCollection> {
  const cached = geojsonCache.get(sourceKey)
  if (cached) {
    return cached
  }

  const isLocal = url.startsWith('/') || url.startsWith('frontend-gis.upload.geojson')
  const collection = isLocal ? await loadGeojsonFromLocalFile(url) : await loadGeojsonFromRemoteUrl(url)
  geojsonCache.set(sourceKey, collection)
  return collection
}

export function clearGeojsonCache(key?: string): void {
  if (key) {
    geojsonCache.delete(key)
    return
  }
  geojsonCache.clear()
}
