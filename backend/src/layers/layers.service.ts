import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CreateLayerDto } from './dto/create-layer.dto';
import { UpdateLayerDto } from './dto/update-layer.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Layer } from './entities/layer.entity';
import { IsNull, Repository } from 'typeorm';
import { SpatialEntity } from '../spatial-entities/entities/spatial-entity.entity';
import { GeoJsonDownloaderService } from './services/geojson-downloader.service';
import { GeoJsonPipelineService, PipelineResult } from './services/geojson-pipeline.service';
import { LayerResponseDto } from './dto/layer-response.dto';
import type { Multer } from 'multer';
import sharp from 'sharp';
import * as fs from 'fs';
import { extname } from 'path';

@Injectable()
export class LayersService {
  private readonly logger = new Logger(LayersService.name);

  constructor(
    @InjectRepository(Layer)
    private readonly layerRepository: Repository<Layer>,
    @InjectRepository(SpatialEntity)
    private readonly spatialEntityRepository: Repository<SpatialEntity>,
    private readonly downloader: GeoJsonDownloaderService,
    private readonly pipeline: GeoJsonPipelineService,
  ) { }

  private async saveLayerSafely(layer: Layer): Promise<Layer> {
    try {
      return await this.layerRepository.save(layer);
    } catch (err: any) {
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('unique constraint')) {
        throw new BadRequestException(`Tên lớp dữ liệu "${layer.name}" đã tồn tại. Vui lòng chọn tên khác.`);
      }
      throw err;
    }
  }

  private parseFormDataPayload(
    payload: Partial<CreateLayerDto>,
  ): Partial<CreateLayerDto> {
    const parsed: Partial<CreateLayerDto> = { ...payload };

    if (typeof parsed.visible === 'string') {
      parsed.visible = (parsed.visible as unknown as string) === 'true';
    }

    if (typeof parsed.minZoom === 'string') {
      const v = Number(parsed.minZoom);
      parsed.minZoom = Number.isFinite(v) ? v : undefined;
    }
    if (typeof parsed.maxZoom === 'string') {
      const v = Number(parsed.maxZoom);
      parsed.maxZoom = Number.isFinite(v) ? v : undefined;
    }
    if (typeof parsed.zIndex === 'string') {
      const v = Number(parsed.zIndex);
      parsed.zIndex = Number.isFinite(v) ? v : undefined;
    }
    if (typeof parsed.elevation === 'string') {
      const v = Number(parsed.elevation);
      parsed.elevation = Number.isFinite(v) ? v : undefined;
    }
    if (typeof parsed.scale === 'string') {
      const v = Number(parsed.scale);
      parsed.scale = Number.isFinite(v) ? v : undefined;
    }
    if (typeof parsed.height === 'string') {
      const v = Number(parsed.height);
      parsed.height = Number.isFinite(v) ? v : undefined;
    }

    if (typeof parsed.metadata === 'string') {
      try {
        parsed.metadata = JSON.parse(parsed.metadata);
      } catch {
        parsed.metadata = undefined;
      }
    }

    return parsed;
  }

  private async syncSpatialEntities(layer: Layer, features: any[]) {
    await this.spatialEntityRepository.delete({ layer: { id: layer.id } });

    const entities = features.map((feature, index) => {
      const properties = feature.properties ?? {};
      return this.spatialEntityRepository.create({
        name: properties.name ?? `feature_${index + 1}`,
        type: properties.type ?? feature.geometry.type.toLowerCase(),
        renderType: properties.renderType,
        geometry: feature.geometry,
        elevation: properties.elevation ?? 0,
        height: properties.height ?? 0,
        width: properties.width ?? 1,
        assetUrl: properties.assetUrl ?? null,
        iconUrl: properties.iconUrl ?? null,
        color: properties.color ?? null,
        opacity: properties.opacity ?? 1,
        scaleX: properties.scaleX ?? properties.scale ?? 1,
        scaleY: properties.scaleY ?? properties.scale ?? 1,
        scaleZ: properties.scaleZ ?? properties.scale ?? 1,
        rotationX: properties.rotationX ?? properties.rotation ?? 0,
        rotationY: properties.rotationY ?? properties.rotation ?? 0,
        rotationZ: properties.rotationZ ?? properties.rotation ?? 0,
        modelUrl: properties.modelUrl ?? properties.assetUrl ?? null,
        metadata: properties,
        layer,
      });
    });

    if (entities.length > 0) {
      const chunkSize = 200;
      for (let i = 0; i < entities.length; i += chunkSize) {
        const chunk = entities.slice(i, i + chunkSize);
        await this.spatialEntityRepository.save(chunk);
      }
    }
  }

  private toResponseDto(
    layer: Layer,
    dataStatus: 'latest' | 'fallback',
    fallbackReason?: string,
    includeCollections = false,
  ): LayerResponseDto {
    const renderCache = layer.renderCache ?? {
      renderer: null,
      popupTemplate: null,
      featureCollection: { type: 'FeatureCollection', features: [] },
      vertexFeatureCollection: undefined,
    };
    const hasVertexCollection = Boolean(renderCache.vertexFeatureCollection);

    const response: LayerResponseDto = {
      id: layer.id,
      name: layer.name,
      type: layer.type,
      visible: layer.visible,
      minZoom: layer.minZoom,
      maxZoom: layer.maxZoom,
      zIndex: layer.zIndex,
      elevation: layer.elevation,
      scale: layer.scale,
      height: layer.height,
      modelUrl: layer.modelUrl,
      iconUrl: layer.iconUrl,
      dataUrl: layer.dataUrl,
      metadata: layer.metadata,
      extent: layer.extent,
      renderer: renderCache.renderer,
      popupTemplate: renderCache.popupTemplate,
      featureCollectionUrl: `/api/layers/${layer.id}/geojson`,
      vertexFeatureCollectionUrl: hasVertexCollection
        ? `/api/layers/${layer.id}/vertices.geojson`
        : undefined,
      entities: layer.entities ?? [],
      dataStatus,
      fallbackInfo: {
        useFallbackData: dataStatus === 'fallback',
        reason: fallbackReason,
      },
    };

    if (includeCollections) {
      response.featureCollection = renderCache.featureCollection ?? {
        type: 'FeatureCollection',
        features: [],
      };
      response.vertexFeatureCollection = renderCache.vertexFeatureCollection;
    }

    return response;
  }

  private async buildRenderCacheFromEntities(layer: Layer): Promise<void> {
    const entities = await this.spatialEntityRepository.find({
      where: { layer: { id: layer.id } },
      relations: { model: true, scene: true },
    });
    if (entities.length === 0) return;

    const mockFeatureCollection = {
      type: 'FeatureCollection',
      features: entities.map((entity) => ({
        type: 'Feature',
        geometry: entity.geometry,
        properties: this.buildFeatureProperties(entity),
      })),
    };

    const pipelineResult = this.pipeline.process(mockFeatureCollection, {
      elevation: layer.elevation,
      scale: layer.scale,
      height: layer.height,
      modelUrl: layer.modelUrl,
      iconUrl: layer.iconUrl,
    });

    layer.extent = pipelineResult.extent;
    layer.renderCache = {
      renderer: pipelineResult.renderer,
      popupTemplate: pipelineResult.popupTemplate,
      featureCollection: pipelineResult.featureCollection,
      vertexFeatureCollection: pipelineResult.vertexFeatureCollection,
    };

    await this.layerRepository.save(layer);
  }

  private async ensureRenderCache(layer: Layer): Promise<void> {
    if (layer.dataUrl?.trim() && !layer.renderCache) {
      await this.tryProcessRemoteData(layer);
      const reloaded = await this.layerRepository.findOne({ where: { id: layer.id } });
      if (reloaded) {
        layer.extent = reloaded.extent;
        layer.renderCache = reloaded.renderCache;
      }
    }

    if (!layer.renderCache) {
      await this.buildRenderCacheFromEntities(layer);
    }
  }

  async getFeatureCollection(id: string, variant: 'features' | 'vertices') {
    const layer = await this.layerRepository.findOne({ where: { id } });
    if (!layer) {
      throw new NotFoundException(`Layer ${id} not found`);
    }

    await this.ensureRenderCache(layer);

    if (variant === 'vertices') {
      return layer.renderCache?.vertexFeatureCollection ?? {
        type: 'FeatureCollection',
        features: [],
      };
    }

    return layer.renderCache?.featureCollection ?? {
      type: 'FeatureCollection',
      features: [],
    };
  }

  private async reloadLayerWithCount(id: string): Promise<Layer> {
    const layer = await this.layerRepository.findOne({ where: { id } });
    if (!layer) throw new NotFoundException(`Layer ${id} not found`);
    const count = await this.spatialEntityRepository.count({ where: { layer: { id } } });
    layer.entities = { length: count } as any;
    return layer;
  }

  private buildFeatureProperties(entity: SpatialEntity) {
    return {
      ...(entity.metadata ?? {}),
      id: entity.id,
      entityId: entity.id,
      backendEntityId: entity.id,
      name: entity.name,
      type: entity.type,
      renderType: entity.renderType,
      elevation: entity.elevation,
      height: entity.height,
      width: entity.width,
      color: entity.color,
      opacity: entity.opacity,
      scaleX: entity.scaleX,
      scaleY: entity.scaleY,
      scaleZ: entity.scaleZ,
      rotationX: entity.rotationX,
      rotationY: entity.rotationY,
      rotationZ: entity.rotationZ,
      modelId: entity.model?.id ?? null,
      sceneId: entity.scene?.id ?? null,
      modelUrl: entity.modelUrl ?? entity.model?.assetUrl ?? null,
    };
  }

  private async tryProcessRemoteData(layer: Layer): Promise<{
    status: 'latest' | 'fallback';
    reason?: string;
  }> {
    if (!layer.dataUrl?.trim()) {
      return { status: 'latest' };
    }

    const geoJsonData = await this.downloader.download(layer.dataUrl);
    if (!geoJsonData) {
      return {
        status: 'fallback',
        reason: 'Failed to download data from remote URL. Using cached fallback data.',
      };
    }

    try {
      const pipelineResult = this.pipeline.process(geoJsonData, {
        elevation: layer.elevation,
        scale: layer.scale,
        height: layer.height,
        modelUrl: layer.modelUrl,
        iconUrl: layer.iconUrl,
      });

      layer.extent = pipelineResult.extent;
      layer.renderCache = {
        renderer: pipelineResult.renderer,
        popupTemplate: pipelineResult.popupTemplate,
        featureCollection: pipelineResult.featureCollection,
        vertexFeatureCollection: pipelineResult.vertexFeatureCollection,
      };

      await this.layerRepository.save(layer);
      await this.syncSpatialEntities(layer, pipelineResult.featureCollection.features);
      await this.buildRenderCacheFromEntities(layer);

      return { status: 'latest' };
    } catch (err: any) {
      this.logger.error(`Failed to process downloaded GeoJSON for layer ${layer.id}: ${err.message}`);
      return {
        status: 'fallback',
        reason: `Failed to process remote GeoJSON: ${err.message}. Using cached fallback data.`,
      };
    }
  }

  async create(createLayerDto: CreateLayerDto): Promise<LayerResponseDto> {
    const layer = this.layerRepository.create({
      name: createLayerDto.name,
      type: createLayerDto.type ?? 'Point',
      visible: createLayerDto.visible ?? true,
      minZoom: createLayerDto.minZoom ?? 0,
      maxZoom: createLayerDto.maxZoom ?? 24,
      zIndex: createLayerDto.zIndex ?? 0,
      elevation: createLayerDto.elevation ?? 0,
      scale: createLayerDto.scale ?? 1,
      height: createLayerDto.height ?? 0,
      modelUrl: createLayerDto.modelUrl ?? null,
      iconUrl: createLayerDto.iconUrl ?? null,
      dataUrl: createLayerDto.dataUrl ?? null,
      metadata: createLayerDto.metadata ?? {},
    });

    const savedLayer = await this.saveLayerSafely(layer);

    if (savedLayer.dataUrl?.trim()) {
      const result = await this.tryProcessRemoteData(savedLayer);
      const reloaded = await this.reloadLayerWithCount(savedLayer.id);
      return this.toResponseDto(reloaded, result.status, result.reason);
    }

    const reloaded = await this.reloadLayerWithCount(savedLayer.id);
    return this.toResponseDto(reloaded, 'latest');
  }

  async createFromGeoJson(
    file: Multer.File,
    payload: Partial<CreateLayerDto>,
  ): Promise<LayerResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('GeoJSON file is required');
    }

    const parsed = this.parseFormDataPayload(payload);

    const layer = this.layerRepository.create({
      name: parsed.name ?? file.originalname.replace(/\.geojson$/i, ''),
      type: parsed.type ?? 'geojson',
      visible: parsed.visible ?? true,
      minZoom: parsed.minZoom ?? 0,
      maxZoom: parsed.maxZoom ?? 24,
      zIndex: parsed.zIndex ?? 0,
      elevation: parsed.elevation ?? 0,
      scale: parsed.scale ?? 1,
      height: parsed.height ?? 0,
      modelUrl: parsed.modelUrl ?? null,
      iconUrl: parsed.iconUrl ?? null,
      dataUrl: parsed.dataUrl ?? null,
      metadata: parsed.metadata ?? {},
    });

    const savedLayer = await this.saveLayerSafely(layer);

    try {
      const pipelineResult = this.pipeline.process(file.buffer, {
        elevation: savedLayer.elevation,
        scale: savedLayer.scale,
        height: savedLayer.height,
        modelUrl: savedLayer.modelUrl,
        iconUrl: savedLayer.iconUrl,
      });

      savedLayer.extent = pipelineResult.extent;
      savedLayer.renderCache = {
        renderer: pipelineResult.renderer,
        popupTemplate: pipelineResult.popupTemplate,
        featureCollection: pipelineResult.featureCollection,
        vertexFeatureCollection: pipelineResult.vertexFeatureCollection,
      };

      const updatedLayer = await this.saveLayerSafely(savedLayer);
      await this.syncSpatialEntities(updatedLayer, pipelineResult.featureCollection.features);
      await this.buildRenderCacheFromEntities(updatedLayer);

      const reloaded = await this.reloadLayerWithCount(updatedLayer.id);
      return this.toResponseDto(reloaded, 'latest');
    } catch (err: any) {
      await this.layerRepository.remove(savedLayer);
      throw new BadRequestException(`Failed to process GeoJSON: ${err.message}`);
    }
  }

  async findAll(): Promise<LayerResponseDto[]> {
    const nullCacheLayers = await this.layerRepository.find({
      where: { renderCache: IsNull() },
    });

    for (const layer of nullCacheLayers) {
      if (layer.dataUrl?.trim()) {
        await this.tryProcessRemoteData(layer);
      } else {
        await this.buildRenderCacheFromEntities(layer);
      }
    }

    const rows = await this.layerRepository.query(`
      SELECT
        l.id,
        l.name,
        l.type,
        l.visible,
        l."minZoom",
        l."maxZoom",
        l."zIndex",
        l.elevation,
        l.scale,
        l.height,
        l."modelUrl",
        l."iconUrl",
        l."dataUrl",
        l.metadata,
        l.extent,
        l."renderCache" -> 'renderer' AS "renderer",
        l."renderCache" -> 'popupTemplate' AS "popupTemplate",
        l."renderCache" -> 'vertexFeatureCollection' IS NOT NULL AS "hasVertexFeatureCollection",
        COALESCE((
          SELECT COUNT(*)::int
          FROM spatial_entity se
          WHERE se.layer_id = l.id
        ), 0) AS "entityCount"
      FROM "layer" l
    `);

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      visible: row.visible,
      minZoom: row.minZoom,
      maxZoom: row.maxZoom,
      zIndex: row.zIndex,
      elevation: row.elevation,
      scale: row.scale,
      height: row.height,
      modelUrl: row.modelUrl,
      iconUrl: row.iconUrl,
      dataUrl: row.dataUrl,
      metadata: row.metadata,
      extent: row.extent,
      renderer: row.renderer,
      popupTemplate: row.popupTemplate,
      featureCollectionUrl: `/api/layers/${row.id}/geojson`,
      vertexFeatureCollectionUrl: row.hasVertexFeatureCollection
        ? `/api/layers/${row.id}/vertices.geojson`
        : undefined,
      entities: { length: Number(row.entityCount) } as any,
      dataStatus: 'latest',
      fallbackInfo: {
        useFallbackData: false,
      },
    }));
  }

  async findOne(id: string): Promise<LayerResponseDto> {
    const layer = await this.layerRepository.findOne({
      where: { id },
    });
    if (!layer) {
      throw new NotFoundException(`Layer ${id} not found`);
    }

    if (layer.dataUrl?.trim() && !layer.renderCache) {
      const result = await this.tryProcessRemoteData(layer);
      const reloaded = await this.reloadLayerWithCount(id);
      return this.toResponseDto(reloaded, result.status, result.reason);
    }

    if (!layer.renderCache) {
      await this.buildRenderCacheFromEntities(layer);
    }

    const count = await this.spatialEntityRepository.count({ where: { layer: { id: layer.id } } });
    layer.entities = { length: count } as any;
    return this.toResponseDto(layer, 'latest');
  }

  async update(id: string, updateLayerDto: UpdateLayerDto): Promise<LayerResponseDto> {
    const layer = await this.layerRepository.findOne({
      where: { id },
    });
    if (!layer) {
      throw new NotFoundException(`Layer ${id} not found`);
    }

    const requiresReprocessing =
      (updateLayerDto.dataUrl !== undefined && updateLayerDto.dataUrl !== layer.dataUrl) ||
      (updateLayerDto.elevation !== undefined && updateLayerDto.elevation !== layer.elevation) ||
      (updateLayerDto.scale !== undefined && updateLayerDto.scale !== layer.scale) ||
      (updateLayerDto.height !== undefined && updateLayerDto.height !== layer.height) ||
      (updateLayerDto.modelUrl !== undefined && updateLayerDto.modelUrl !== layer.modelUrl) ||
      (updateLayerDto.iconUrl !== undefined && updateLayerDto.iconUrl !== layer.iconUrl);

    Object.assign(layer, updateLayerDto);
    const savedLayer = await this.saveLayerSafely(layer);

    if (requiresReprocessing) {
      savedLayer.renderCache = null as any;
      await this.saveLayerSafely(savedLayer);

      if (savedLayer.dataUrl?.trim()) {
        const result = await this.tryProcessRemoteData(savedLayer);
        const reloaded = await this.reloadLayerWithCount(savedLayer.id);
        return this.toResponseDto(reloaded, result.status, result.reason);
      }

      const entities = await this.spatialEntityRepository.find({
        where: { layer: { id: savedLayer.id } },
        relations: { model: true, scene: true },
      });

      if (entities.length > 0) {
        const mockFeatureCollection = {
          type: 'FeatureCollection',
          features: entities.map((entity) => ({
            type: 'Feature',
            geometry: entity.geometry,
            properties: this.buildFeatureProperties(entity),
          })),
        };

        try {
          const pipelineResult = this.pipeline.process(mockFeatureCollection, {
            elevation: savedLayer.elevation,
            scale: savedLayer.scale,
            height: savedLayer.height,
            modelUrl: savedLayer.modelUrl,
            iconUrl: savedLayer.iconUrl,
          });

          savedLayer.extent = pipelineResult.extent;
          savedLayer.renderCache = {
            renderer: pipelineResult.renderer,
            popupTemplate: pipelineResult.popupTemplate,
            featureCollection: pipelineResult.featureCollection,
            vertexFeatureCollection: pipelineResult.vertexFeatureCollection,
          };

          const updatedLayer = await this.saveLayerSafely(savedLayer);
          await this.syncSpatialEntities(updatedLayer, pipelineResult.featureCollection.features);
          await this.buildRenderCacheFromEntities(updatedLayer);
        } catch (err: any) {
          this.logger.error(`Failed to sync render cache on update for layer ${savedLayer.id}: ${err.message}`);
        }
      }
    }

    const finalReloaded = await this.reloadLayerWithCount(savedLayer.id);
    return this.toResponseDto(finalReloaded, 'latest');
  }

  async remove(id: string) {
    const layer = await this.layerRepository.findOne({ where: { id } });
    if (!layer) {
      throw new NotFoundException(`Layer ${id} not found`);
    }
    await this.spatialEntityRepository.delete({ layer: { id } });
    await this.layerRepository.remove(layer);
    return { deleted: true };
  }

  async attachModel(id: string, file: Multer.File): Promise<LayerResponseDto> {
    if (!file?.filename) {
      throw new BadRequestException('Model file is required');
    }

    const layer = await this.layerRepository.findOne({ where: { id } });
    if (!layer) {
      throw new NotFoundException(`Layer ${id} not found`);
    }

    const newModelUrl = `/uploads/models/${file.filename}`;
    return this.update(id, { modelUrl: newModelUrl });
  }

  async attachIcon(id: string, file: Multer.File): Promise<LayerResponseDto> {
    if (!file?.filename) {
      throw new BadRequestException('Icon file is required');
    }

    const layer = await this.layerRepository.findOne({ where: { id } });
    if (!layer) {
      throw new NotFoundException(`Layer ${id} not found`);
    }

    try {
      const filePath = file.path;
      if (filePath) {
        const fileBuffer = await fs.promises.readFile(filePath);
        const ext = extname(file.originalname).toLowerCase();

        if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
          const image = sharp(fileBuffer);
          const metadata = await image.metadata();

          if ((metadata.width && metadata.width > 1024) || (metadata.height && metadata.height > 1024)) {
            image.resize(1024, 1024, {
              fit: 'inside',
              withoutEnlargement: true,
            });
          }

          let compressedBuffer: Buffer;
          if (ext === '.png') {
            compressedBuffer = await image.png({ quality: 80, compressionLevel: 8 }).toBuffer();
          } else {
            compressedBuffer = await image.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
          }

          await fs.promises.writeFile(filePath, compressedBuffer);
        }
      }
    } catch (err) {
      this.logger.error('Failed to compress and optimize icon image:', err);
    }

    const newIconUrl = `/uploads/icons/${file.filename}`;
    return this.update(id, { iconUrl: newIconUrl });
  }
}
