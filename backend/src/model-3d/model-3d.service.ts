import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Multer } from 'multer';
import { Model3D } from './entities/model-3d.entity';
import { CreateModel3DDto } from './dto/create-model-3d.dto';
import { UpdateModel3DDto } from './dto/update-model-3d.dto';

@Injectable()
export class Model3DService {
  constructor(
    @InjectRepository(Model3D)
    private readonly modelRepository: Repository<Model3D>,
  ) {}

  private parsePayload(payload: Partial<CreateModel3DDto>): Partial<CreateModel3DDto> {
    const parsed: Partial<CreateModel3DDto> = { ...payload };
    if (typeof parsed.metadata === 'string') {
      try {
        parsed.metadata = JSON.parse(parsed.metadata);
      } catch {
        parsed.metadata = null;
      }
    }
    if (typeof parsed.sceneSublayers === 'string') {
      try {
        parsed.sceneSublayers = JSON.parse(parsed.sceneSublayers);
      } catch {
        parsed.sceneSublayers = null;
      }
    }
    if (typeof parsed.fileSize === 'string') {
      const value = Number(parsed.fileSize);
      parsed.fileSize = Number.isFinite(value) ? value : null;
    }
    return parsed;
  }

  create(createModelDto: CreateModel3DDto) {
    const model = this.modelRepository.create({
      name: createModelDto.name,
      description: createModelDto.description ?? null,
      assetUrl: createModelDto.assetUrl ?? null,
      originalFilename: createModelDto.originalFilename ?? null,
      mimeType: createModelDto.mimeType ?? null,
      fileSize: createModelDto.fileSize ?? null,
      category: createModelDto.category ?? 'model',
      thumbnailUrl: createModelDto.thumbnailUrl ?? null,
      metadata: createModelDto.metadata ?? {},
      sceneServiceUrl: createModelDto.sceneServiceUrl ?? null,
      arcgisItemId: createModelDto.arcgisItemId ?? null,
      publishStatus: createModelDto.publishStatus ?? 'none',
      sceneLayerType: createModelDto.sceneLayerType ?? 'scene',
      sceneSublayers: createModelDto.sceneSublayers ?? null,
    });
    return this.modelRepository.save(model);
  }

  async createFromUpload(file: Multer.File, payload: Partial<CreateModel3DDto>) {
    if (!file?.filename) {
      throw new BadRequestException('Model file is required');
    }
    const parsed = this.parsePayload(payload);
    return this.create({
      name: parsed.name ?? file.originalname.replace(/\.(glb|gltf)$/i, ''),
      description: parsed.description ?? null,
      assetUrl: `/uploads/models/${file.filename}`,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      category: parsed.category ?? 'model',
      thumbnailUrl: parsed.thumbnailUrl ?? null,
      metadata: parsed.metadata ?? {},
      sceneServiceUrl: parsed.sceneServiceUrl ?? null,
      arcgisItemId: parsed.arcgisItemId ?? null,
      publishStatus: parsed.publishStatus ?? 'pending',
      sceneLayerType: parsed.sceneLayerType ?? 'scene',
      sceneSublayers: parsed.sceneSublayers ?? null,
    });
  }

  findAll() {
    return this.modelRepository.find({
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const model = await this.modelRepository.findOne({ where: { id } });
    if (!model) {
      throw new NotFoundException(`Model3D ${id} not found`);
    }
    return model;
  }

  async update(id: string, updateModelDto: UpdateModel3DDto) {
    const model = await this.findOne(id);
    Object.assign(model, updateModelDto);
    return this.modelRepository.save(model);
  }

  async attachFile(id: string, file: Multer.File) {
    if (!file?.filename) {
      throw new BadRequestException('Model file is required');
    }
    const model = await this.findOne(id);
    model.assetUrl = `/uploads/models/${file.filename}`;
    model.originalFilename = file.originalname;
    model.mimeType = file.mimetype;
    model.fileSize = file.size;
    model.publishStatus = 'pending';
    return this.modelRepository.save(model);
  }

  async remove(id: string) {
    const model = await this.findOne(id);
    await this.modelRepository.remove(model);
    return { deleted: true };
  }
}
