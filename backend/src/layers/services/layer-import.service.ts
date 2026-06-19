import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { GeoJsonDownloaderService } from './geojson-downloader.service';
import {
  buildArcGISQueryUrl,
  inferArcGISLayerName,
  isArcGISQueryLikeUrl,
} from '../utils/arcgis.utils';
import {
  isWgs84SpatialReference,
  mapEsriGeometryToGeoJsonType,
  mapGeoJsonGeometryToLayerType,
} from '../utils/geometry.utils';

export interface LayerImportPreview {
  name: string;
  type: 'Point' | 'LineString' | 'Polygon';
  dataUrl: string;
  sourceType: 'arcgis' | 'geojson-url';
  featureCount: number;
  metadata: Record<string, any>;
  warnings: string[];
}

@Injectable()
export class LayerImportService {
  private readonly logger = new Logger(LayerImportService.name);

  constructor(private readonly downloader: GeoJsonDownloaderService) {}

  async previewSourceUrl(sourceUrl: string): Promise<LayerImportPreview> {
    if (!sourceUrl?.trim()) {
      throw new BadRequestException('URL is required');
    }

    const sourceType = isArcGISQueryLikeUrl(sourceUrl) ? 'arcgis' : 'geojson-url';
    this.logger.log(`[LayerImport] Parse ${sourceType === 'arcgis' ? 'ArcGIS' : 'GeoJSON'} URL`);

    const dataUrl =
      sourceType === 'arcgis'
        ? buildArcGISQueryUrl(sourceUrl, 'geojson')
        : sourceUrl.trim();

    const metadata: Record<string, any> = { sourceType };
    const warnings: string[] = [];

    if (sourceType === 'arcgis') {
      const esriInfo = await this.fetchArcGISInfo(sourceUrl);
      if (esriInfo.geometryType) {
        metadata.esriGeometryType = esriInfo.geometryType;
      }
      if (esriInfo.spatialReference) {
        metadata.spatialReference = esriInfo.spatialReference;
        if (!isWgs84SpatialReference(esriInfo.spatialReference)) {
          warnings.push(
            'Dữ liệu nguồn không phải WGS84. Hệ thống ưu tiên URL GeoJSON có outSR=4326 để ArcGIS chuyển tọa độ.',
          );
        }
      }
    }

    this.logger.log('[LayerImport] Fetch GeoJSON');
    const collection = await this.downloader.download(dataUrl);
    const features = collection?.features ?? [];
    if (features.length === 0) {
      throw new BadRequestException('Không tìm thấy Feature nào trong dữ liệu.');
    }

    const geoJsonType =
      features[0]?.geometry?.type ??
      mapEsriGeometryToGeoJsonType(metadata.esriGeometryType);
    const type = mapGeoJsonGeometryToLayerType(geoJsonType);
    const name =
      inferArcGISLayerName(sourceUrl) ??
      this.inferNameFromUrl(sourceUrl) ??
      'Imported Layer';

    this.logger.log(`[LayerImport] Detected geometry ${type}`);
    this.logger.log(`[LayerImport] Imported ${features.length} features`);

    return {
      name,
      type,
      dataUrl,
      sourceType,
      featureCount: features.length,
      metadata,
      warnings,
    };
  }

  private async fetchArcGISInfo(sourceUrl: string) {
    try {
      const response = await axios.get(buildArcGISQueryUrl(sourceUrl, 'json'), {
        timeout: 10000,
        params: {
          resultOffset: 0,
          resultRecordCount: 1,
        },
      });
      return {
        geometryType: response.data?.geometryType,
        fields: response.data?.fields,
        fieldAliases: response.data?.fieldAliases,
        displayFieldName: response.data?.displayFieldName,
        spatialReference: response.data?.spatialReference,
      };
    } catch (err: any) {
      this.logger.warn(`[LayerImport] Could not fetch Esri JSON metadata: ${err.message}`);
      return {};
    }
  }

  private inferNameFromUrl(sourceUrl: string) {
    try {
      const url = new URL(sourceUrl.trim());
      const part = url.pathname.split('/').filter(Boolean).at(-1);
      return part ? decodeURIComponent(part).replace(/\.(geojson|json)$/i, '') : null;
    } catch {
      return null;
    }
  }
}
