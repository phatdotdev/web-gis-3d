import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { buildArcGISQueryUrl, isArcGISQueryLikeUrl } from '../utils/arcgis.utils';

@Injectable()
export class GeoJsonDownloaderService {
  private readonly logger = new Logger(GeoJsonDownloaderService.name);

  async download(url: string): Promise<any | null> {
    if (!url || !url.trim()) {
      return null;
    }
    try {
      const formattedUrl = this.formatArcgisUrl(url);
      this.logger.log(`Downloading layer data from URL: ${formattedUrl}`);

      let offset = 0;
      const limit = 1000;
      let hasMore = true;
      let allFeatures: any[] = [];

      while (hasMore) {
        const pageUrl = new URL(formattedUrl);
        pageUrl.searchParams.set('resultOffset', offset.toString());
        pageUrl.searchParams.set('resultRecordCount', limit.toString());

        const response = await axios.get(pageUrl.toString(), { timeout: 10000 });
        const data = response.data;

        if (!data) {
          this.logger.warn(`No data returned from offset ${offset}`);
          break;
        }

        if (data.error) {
          this.logger.error(`ArcGIS query error at offset ${offset}: ${JSON.stringify(data.error)}`);
          break;
        }

        let pageFeatures: any[] = [];
        let exceeded = false;

        if (data.type === 'FeatureCollection') {
          pageFeatures = data.features || [];
          exceeded = data.exceededTransferLimit === true;
        } else if (data.features && (data.geometryType || data.fields)) {
          // Convert Esri JSON to GeoJSON
          const geojsonData = this.convertEsriJsonToGeoJson(data);
          pageFeatures = geojsonData.features || [];
          exceeded = data.exceededTransferLimit === true;
        } else if (Array.isArray(data.features)) {
          pageFeatures = data.features;
        } else if (data.type === 'Feature' && data.geometry) {
          pageFeatures = [data];
        } else {
          this.logger.warn(`Unrecognized format or empty features from response`);
          break;
        }

        allFeatures = allFeatures.concat(pageFeatures);

        if (exceeded && pageFeatures.length > 0) {
          offset += limit;
        } else {
          hasMore = false;
        }
      }

      if (allFeatures.length === 0) {
        this.logger.warn(`No features fetched from URL: ${formattedUrl}`);
        return null;
      }

      return {
        type: 'FeatureCollection',
        features: allFeatures,
      };
    } catch (error: any) {
      this.logger.error(`Failed to download GeoJSON from ${url}: ${error.message}`);
      return null;
    }
  }

  /**
   * Chuẩn hóa và bổ sung các tham số mặc định cho URL ArcGIS REST Query
   */
  private formatArcgisUrl(inputUrl: string): string {
    try {
      if (isArcGISQueryLikeUrl(inputUrl)) {
        return buildArcGISQueryUrl(inputUrl, 'geojson');
      }
      return new URL(inputUrl.trim()).toString();
    } catch {
      return inputUrl;
    }
  }

  /**
   * Chuyển đổi định dạng Esri JSON sang GeoJSON chuẩn
   */
  private convertEsriJsonToGeoJson(esriJson: any): any {
    const geojson = {
      type: 'FeatureCollection',
      features: [] as any[],
    };

    const geometryType = esriJson.geometryType;
    const features = esriJson.features || [];

    for (const esriFeature of features) {
      const properties = esriFeature.attributes || {};
      let geometry: any = null;

      if (esriFeature.geometry) {
        const typeLower = (geometryType || '').toLowerCase();

        if (typeLower === 'esrigeometrypoint' || typeLower === 'point') {
          const x = esriFeature.geometry.x;
          const y = esriFeature.geometry.y;
          const z = esriFeature.geometry.z;
          const coords = z !== undefined ? [x, y, z] : [x, y];
          geometry = {
            type: 'Point',
            coordinates: coords,
          };
        } else if (typeLower === 'esrigeometrymultipoint' || typeLower === 'multipoint') {
          geometry = {
            type: 'MultiPoint',
            coordinates: esriFeature.geometry.points || [],
          };
        } else if (typeLower === 'esrigeometrypolyline' || typeLower === 'polyline') {
          const paths = esriFeature.geometry.paths || [];
          if (paths.length === 1) {
            geometry = {
              type: 'LineString',
              coordinates: paths[0],
            };
          } else {
            geometry = {
              type: 'MultiLineString',
              coordinates: paths,
            };
          }
        } else if (typeLower === 'esrigeometrypolygon' || typeLower === 'polygon') {
          const rings = esriFeature.geometry.rings || [];
          geometry = {
            type: 'Polygon',
            coordinates: rings,
          };
        }
      }

      geojson.features.push({
        type: 'Feature',
        geometry: geometry,
        properties: properties,
      });
    }

    return geojson;
  }
}
