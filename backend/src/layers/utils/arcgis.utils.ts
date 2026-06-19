export type ArcGISQueryFormat = 'geojson' | 'json';

/**
 * Builds an ArcGIS REST query URL while preserving user-provided query params.
 */
export function buildArcGISQueryUrl(
  sourceUrl: string,
  format: ArcGISQueryFormat,
): string {
  const url = new URL(sourceUrl.trim());
  const mapServerRegex = /\/(MapServer|FeatureServer)\/\d+\/?$/;

  if (!url.pathname.endsWith('/query') && mapServerRegex.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\/?$/, '/query');
  }

  if (!url.searchParams.has('where')) {
    url.searchParams.set('where', '1=1');
  }
  if (!url.searchParams.has('outFields')) {
    url.searchParams.set('outFields', '*');
  }
  if (!url.searchParams.has('returnGeometry')) {
    url.searchParams.set('returnGeometry', 'true');
  }
  if (!url.searchParams.has('outSR')) {
    url.searchParams.set('outSR', '4326');
  }

  url.searchParams.set('f', format);
  return url.toString();
}

export function isArcGISQueryLikeUrl(sourceUrl: string): boolean {
  try {
    const url = new URL(sourceUrl.trim());
    return (
      url.pathname.endsWith('/query') ||
      /\/(MapServer|FeatureServer)\/\d+\/?$/.test(url.pathname) ||
      url.pathname.includes('/MapServer/') ||
      url.pathname.includes('/FeatureServer/')
    );
  } catch {
    return false;
  }
}

export function inferArcGISLayerName(sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl.trim());
    const parts = url.pathname.split('/').filter(Boolean);
    const serverIndex = parts.findIndex(
      (part) => part === 'MapServer' || part === 'FeatureServer',
    );
    if (serverIndex > 0) {
      return decodeURIComponent(parts[serverIndex - 1]);
    }
    const lastMeaningful = parts.filter((part) => part !== 'query').at(-1);
    return lastMeaningful ? decodeURIComponent(lastMeaningful) : null;
  } catch {
    return null;
  }
}
