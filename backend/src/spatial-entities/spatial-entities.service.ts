import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateSpatialEntityDto } from './dto/create-spatial-entity.dto';
import { UpdateSpatialEntityDto } from './dto/update-spatial-entity.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { basename, join } from 'path';
import { unlinkSync } from 'fs';
import { SpatialEntity } from './entities/spatial-entity.entity';
import { Layer } from '../layers/entities/layer.entity';
import { Model3D } from '../model-3d/entities/model-3d.entity';
import { Scene3D } from '../scenes/entities/scene-3d.entity';
@Injectable()
export class SpatialEntitiesService {
  constructor(
    @InjectRepository(SpatialEntity)
    private readonly spatialEntityRepository: Repository<SpatialEntity>,
    @InjectRepository(Layer)
    private readonly layerRepository: Repository<Layer>,
    @InjectRepository(Model3D)
    private readonly modelRepository: Repository<Model3D>,
    @InjectRepository(Scene3D)
    private readonly sceneRepository: Repository<Scene3D>,
  ) {}

  private async resolveModel(modelId?: string | null) {
    if (!modelId) return null;
    const model = await this.modelRepository.findOne({ where: { id: modelId } });
    if (!model) {
      throw new NotFoundException(`Model3D ${modelId} not found`);
    }
    return model;
  }

  private async resolveScene(sceneId?: string | null) {
    if (!sceneId) return null;
    const scene = await this.sceneRepository.findOne({ where: { id: sceneId } });
    if (!scene) {
      throw new NotFoundException(`Scene ${sceneId} not found`);
    }
    return scene;
  }

  private async invalidateLayerCache(layerId: string) {
    await this.layerRepository.update({ id: layerId }, { renderCache: null });
  }

  private async resolveLayer(layerId?: string | null) {
    if (!layerId) return null;
    const layer = await this.layerRepository.findOne({
      where: { id: layerId },
    });
    if (!layer) {
      throw new NotFoundException(`Layer ${layerId} not found`);
    }
    return layer;
  }

  async create(createSpatialEntityDto: CreateSpatialEntityDto) {
    const { layerId, modelId, sceneId, ...data } = createSpatialEntityDto;
    const layer = await this.resolveLayer(layerId);
    const model = await this.resolveModel(modelId);
    const scene = await this.resolveScene(sceneId);
    const entity = this.spatialEntityRepository.create({
      ...data,
      modelUrl: data.modelUrl ?? model?.assetUrl ?? null,
      layer,
      model,
      scene,
    });
    const saved = await this.spatialEntityRepository.save(entity);
    if (layer) {
      await this.invalidateLayerCache(layer.id);
    }
    return saved;
  }

  findAll(layerId?: string) {
    if (layerId) {
      if (layerId === 'none') {
        return this.spatialEntityRepository.find({
          where: { layer: IsNull() },
          relations: { layer: true, model: true, scene: true },
        });
      }
      return this.spatialEntityRepository.find({
        where: { layer: { id: layerId } },
        relations: { layer: true, model: true, scene: true },
      });
    }
    return this.spatialEntityRepository.find({
      relations: { layer: true, model: true, scene: true },
    });
  }

  async findOne(id: string) {
    const entity = await this.spatialEntityRepository.findOne({
      where: { id },
      relations: { layer: true, model: true, scene: true },
    });
    if (!entity) {
      throw new NotFoundException(`SpatialEntity ${id} not found`);
    }
    return entity;
  }

  async update(id: string, updateSpatialEntityDto: UpdateSpatialEntityDto) {
    const entity = await this.spatialEntityRepository.findOne({
      where: { id },
      relations: { layer: true, model: true, scene: true },
    });
    if (!entity) {
      throw new NotFoundException(`SpatialEntity ${id} not found`);
    }

    let oldLayerId = entity.layer?.id;

    if (updateSpatialEntityDto.layerId !== undefined) {
      entity.layer = await this.resolveLayer(updateSpatialEntityDto.layerId);
    }

    if (updateSpatialEntityDto.modelId !== undefined) {
      entity.model = await this.resolveModel(updateSpatialEntityDto.modelId);
      entity.modelUrl = entity.model?.assetUrl ?? null;
    }

    if (updateSpatialEntityDto.sceneId !== undefined) {
      entity.scene = await this.resolveScene(updateSpatialEntityDto.sceneId);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { layerId, modelId, sceneId, ...data } = updateSpatialEntityDto;
    Object.assign(entity, data);
    const saved = await this.spatialEntityRepository.save(entity);
    if (saved.layer?.id) {
      await this.invalidateLayerCache(saved.layer.id);
    }
    if (oldLayerId && oldLayerId !== saved.layer?.id) {
      await this.invalidateLayerCache(oldLayerId);
    }
    return saved;
  }

  async remove(id: string) {
    const entity = await this.spatialEntityRepository.findOne({
      where: { id },
      relations: { layer: true },
    });
    if (!entity) {
      throw new NotFoundException(`SpatialEntity ${id} not found`);
    }
    const layerId = entity.layer?.id;
    await this.spatialEntityRepository.remove(entity);
    if (layerId) {
      await this.invalidateLayerCache(layerId);
    }
    return { deleted: true };
  }

  async attachModel(id: string, file: any): Promise<SpatialEntity> {
    if (!file?.filename) {
      throw new BadRequestException('Model file is required');
    }

    const entity = await this.spatialEntityRepository.findOne({
      where: { id },
      relations: { layer: true },
    });
    if (!entity) {
      throw new NotFoundException(`SpatialEntity ${id} not found`);
    }

    entity.modelUrl = `/uploads/models/${file.filename}`;
    entity.model = null;
    const saved = await this.spatialEntityRepository.save(entity);
    if (saved.layer?.id) {
      await this.invalidateLayerCache(saved.layer.id);
    }
    return saved;
  }

  async attachImage(id: string, file: any): Promise<SpatialEntity> {
    if (!file?.filename) {
      throw new BadRequestException('Image file is required');
    }

    const entity = await this.spatialEntityRepository.findOne({
      where: { id },
      relations: { layer: true, model: true, scene: true },
    });
    if (!entity) {
      throw new NotFoundException(`SpatialEntity ${id} not found`);
    }

    const imageUrl = `/uploads/images/${id}/${file.filename}`;
    entity.images = [...(entity.images ?? []), imageUrl];
    return this.spatialEntityRepository.save(entity);
  }

  async removeImage(id: string, filename: string): Promise<SpatialEntity> {
    const entity = await this.spatialEntityRepository.findOne({
      where: { id },
      relations: { layer: true, model: true, scene: true },
    });
    if (!entity) {
      throw new NotFoundException(`SpatialEntity ${id} not found`);
    }

    const safeFilename = basename(filename);
    const targetUrl = `/uploads/images/${id}/${safeFilename}`;
    const legacyTargetUrl = `/uploads/images/${safeFilename}`;
    entity.images = (entity.images ?? []).filter(
      (url) => url !== targetUrl && url !== legacyTargetUrl,
    );

    try {
      const filePath = join(process.cwd(), 'uploads', 'images', id, safeFilename);
      unlinkSync(filePath);
    } catch {
      // The DB record should still be cleaned up if the file is already gone.
    }

    try {
      const legacyFilePath = join(process.cwd(), 'uploads', 'images', safeFilename);
      unlinkSync(legacyFilePath);
    } catch {
      // Supports cleanup of images uploaded before per-entity folders existed.
    }

    return this.spatialEntityRepository.save(entity);
  }
}
