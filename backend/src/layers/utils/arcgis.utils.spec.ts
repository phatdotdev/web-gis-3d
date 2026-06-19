import { buildArcGISQueryUrl } from './arcgis.utils';

describe('buildArcGISQueryUrl', () => {
  it('adds missing ArcGIS query defaults without overwriting existing params', () => {
    const result = buildArcGISQueryUrl(
      'https://example.com/arcgis/rest/services/A/B/MapServer/0/query?where=OBJECTID%3E10&outFields=NAME',
      'geojson',
    );
    const url = new URL(result);

    expect(url.pathname).toBe('/arcgis/rest/services/A/B/MapServer/0/query');
    expect(url.searchParams.get('where')).toBe('OBJECTID>10');
    expect(url.searchParams.get('outFields')).toBe('NAME');
    expect(url.searchParams.get('returnGeometry')).toBe('true');
    expect(url.searchParams.get('f')).toBe('geojson');
  });

  it('appends /query for layer endpoints', () => {
    const result = buildArcGISQueryUrl(
      'https://example.com/arcgis/rest/services/A/B/FeatureServer/2',
      'json',
    );
    const url = new URL(result);

    expect(url.pathname).toBe('/arcgis/rest/services/A/B/FeatureServer/2/query');
    expect(url.searchParams.get('f')).toBe('json');
  });
});
