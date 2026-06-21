import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scene3D } from './entities/scene-3d.entity';
import { SpatialEntity } from '../spatial-entities/entities/spatial-entity.entity';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { ModelProcessorService } from './model-processor.service';

@Injectable()
export class ScenesService {
  constructor(
    @InjectRepository(Scene3D)
    private readonly sceneRepository: Repository<Scene3D>,
    @InjectRepository(SpatialEntity)
    private readonly spatialEntityRepository: Repository<SpatialEntity>,
    private readonly modelProcessorService: ModelProcessorService,
  ) {}

  private projectOffset(
    parentLat: number,
    parentLng: number,
    parentElevation: number,
    parentHeading: number,
    offset: { x: number; y: number; z: number },
  ) {
    const headingRad = (parentHeading * Math.PI) / 180;
    const baseDx = offset.x; // East
    const baseDy = -offset.z; // North
    const baseDz = offset.y; // Up
    
    const dx = baseDx * Math.cos(headingRad) + baseDy * Math.sin(headingRad);
    const dy = -baseDx * Math.sin(headingRad) + baseDy * Math.cos(headingRad);

    const deltaLatitude = dy / 111132;
    const deltaLongitude = dx / (111132 * Math.cos((parentLat * Math.PI) / 180));

    return {
      longitude: parentLng + deltaLongitude,
      latitude: parentLat + deltaLatitude,
      elevation: parentElevation + baseDz,
    };
  }

  private buildChildSpatialEntityData(parent: Scene3D, child: Scene3D) {
    const parentPosition = parent.position ?? { x: 0, y: 0, z: 0 };
    const parentRotation = parent.rotation ?? { x: 0, y: 0, z: 0 };
    const childRotation = child.rotation ?? { x: 0, y: 0, z: 0 };
    const childScale = child.scale ?? { x: 1, y: 1, z: 1 };
    const geo = this.projectOffset(
      parentPosition.y,
      parentPosition.x,
      parentPosition.z,
      parentRotation.z,
      child.position ?? { x: 0, y: 0, z: 0 },
    );

    return {
      name: child.name,
      type: 'scene_component',
      renderType: '3d_model',
      geometry: {
        type: 'Point',
        coordinates: [geo.longitude, geo.latitude],
      },
      elevation: geo.elevation,
      scaleX: childScale.x,
      scaleY: childScale.y,
      scaleZ: childScale.z,
      rotationX: parentRotation.x + childRotation.x,
      rotationY: parentRotation.y + childRotation.y,
      rotationZ: parentRotation.z + childRotation.z,
      assetUrl: child.fileUrl || '',
      modelUrl: child.fileUrl || null,
      metadata: {
        sceneNodeId: child.id,
        parentSceneId: parent.id,
      },
    };
  }

  private async syncChildSpatialEntities(parentId: string) {
    const parent = await this.sceneRepository.findOne({
      where: { id: parentId },
      relations: { children: true },
    });
    if (!parent) return;

    for (const child of parent.children ?? []) {
      const data = this.buildChildSpatialEntityData(parent, child);
      const existing = await this.spatialEntityRepository.findOne({
        where: { scene: { id: child.id } },
        relations: { scene: true },
      });

      if (existing) {
        Object.assign(existing, data);
        existing.metadata = {
          ...(existing.metadata ?? {}),
          ...data.metadata,
        };
        existing.scene = child;
        await this.spatialEntityRepository.save(existing);
        continue;
      }

      await this.spatialEntityRepository.save(
        this.spatialEntityRepository.create({
          ...data,
          scene: child,
        }),
      );
    }
  }

  async createAndPlaceScene(
    name: string,
    description: string | null,
    filePath: string,
    placement: { longitude: number; latitude: number; elevation: number; heading: number; scale?: number },
  ) {
    const scaleVal = placement.scale ?? 1;
    let parentScene = this.sceneRepository.create({
      name,
      description,
      fileUrl: null,
      lodLevel: 0,
      position: { x: placement.longitude, y: placement.latitude, z: placement.elevation },
      rotation: { x: 0, y: 0, z: placement.heading },
      scale: { x: scaleVal, y: scaleVal, z: scaleVal },
      visible: true,
      metadata: {},
    });
    parentScene = await this.sceneRepository.save(parentScene);

    const { rootFileUrl, children } = await this.modelProcessorService.uploadAndPlaceGltf(
      filePath,
      parentScene.id,
    );

    parentScene.fileUrl = rootFileUrl;
    await this.sceneRepository.save(parentScene);

    const childScenes: Scene3D[] = [];
    for (const childData of children) {
      childScenes.push(
        this.sceneRepository.create({
          name: childData.name,
          fileUrl: childData.fileUrl,
          lodLevel: 1,
          position: childData.position,
          rotation: childData.rotation,
          scale: childData.scale,
          visible: true,
          parent: parentScene,
        })
      );
    }
    await this.sceneRepository.save(childScenes);

    return await this.sceneRepository.findOne({
      where: { id: parentScene.id },
      relations: { children: true, entities: true }
    });
  }

  private async resolveParent(parentId?: string | null, currentId?: string) {
    if (!parentId) return null;
    if (currentId && parentId === currentId) {
      throw new BadRequestException('Scene cannot be its own parent');
    }
    const parent = await this.sceneRepository.findOne({ where: { id: parentId } });
    if (!parent) {
      throw new NotFoundException(`Parent scene ${parentId} not found`);
    }
    return parent;
  }

  async create(createSceneDto: CreateSceneDto) {
    const parent = await this.resolveParent(createSceneDto.parentId);
    const scene = this.sceneRepository.create({
      name: createSceneDto.name,
      description: createSceneDto.description ?? null,
      fileUrl: createSceneDto.fileUrl ?? null,
      lodLevel: createSceneDto.lodLevel ?? 0,
      position: createSceneDto.position ?? { x: 0, y: 0, z: 0 },
      rotation: createSceneDto.rotation ?? { x: 0, y: 0, z: 0 },
      scale: createSceneDto.scale ?? { x: 1, y: 1, z: 1 },
      visible: createSceneDto.visible ?? true,
      sortOrder: createSceneDto.sortOrder ?? 0,
      metadata: createSceneDto.metadata ?? {},
      parent,
    });
    return this.sceneRepository.save(scene);
  }

  findAll() {
    return this.sceneRepository.find({
      relations: { parent: true, children: true, entities: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const scene = await this.sceneRepository.findOne({
      where: { id },
      relations: { parent: true, children: true, entities: true },
    });
    if (!scene) {
      throw new NotFoundException(`Scene ${id} not found`);
    }
    return scene;
  }

  async update(id: string, updateSceneDto: UpdateSceneDto) {
    const scene = await this.sceneRepository.findOne({
      where: { id },
      relations: { parent: true },
    });
    if (!scene) {
      throw new NotFoundException(`Scene ${id} not found`);
    }

    if (updateSceneDto.parentId !== undefined) {
      scene.parent = await this.resolveParent(updateSceneDto.parentId, id);
    }

    const { parentId: _parentId, ...data } = updateSceneDto;
    Object.assign(scene, data);
    return this.sceneRepository.save(scene);
  }

  async findByLodLevel(lodLevel: number) {
    return this.sceneRepository.find({
      where: { lodLevel },
      relations: { parent: true, children: true, entities: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findChildrenByParentId(parentId: string, minLod?: number) {
    const queryBuilder = this.sceneRepository
      .createQueryBuilder('scene')
      .leftJoinAndSelect('scene.parent', 'parent')
      .leftJoinAndSelect('scene.children', 'children')
      .leftJoinAndSelect('scene.entities', 'entities')
      .where('parent.id = :parentId', { parentId });

    if (minLod !== undefined) {
      queryBuilder.andWhere('scene.lodLevel >= :minLod', { minLod });
    }

    return queryBuilder.orderBy('scene.sortOrder', 'ASC').addOrderBy('scene.name', 'ASC').getMany();
  }

  async updateTransform(
    id: string,
    transform: {
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: { x: number; y: number; z: number };
    },
  ) {
    const scene = await this.sceneRepository.findOne({
      where: { id },
      relations: { parent: true, children: true },
    });
    if (!scene) {
      throw new NotFoundException(`Scene ${id} not found`);
    }

    if (transform.position) {
      scene.position = transform.position;
    }
    if (transform.rotation) {
      scene.rotation = transform.rotation;
    }
    if (transform.scale) {
      scene.scale = transform.scale;
    }

    const saved = await this.sceneRepository.save(scene);
    return this.findOne(saved.id);
  }

  async createSplitScene(
    name: string,
    description: string | null,
    tempFilePath: string,
  ) {
    // 1. Create parent scene entity first to get an ID
    const parentScene = this.sceneRepository.create({
      name,
      description,
      lodLevel: 0,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      visible: true,
      sortOrder: 0,
      metadata: {},
    });
    const savedParent = await this.sceneRepository.save(parentScene);

    try {
      // 2. Perform the GLTF split
      const splitResults = await this.modelProcessorService.splitGltf(tempFilePath, savedParent.id);

      // 3. Update parent with the rootFileUrl
      savedParent.fileUrl = splitResults.rootFileUrl;
      await this.sceneRepository.save(savedParent);

      // 4. Create child scene entities
      const childrenEntities = splitResults.children.map((child) => {
        return this.sceneRepository.create({
          name: child.name,
          description: `Child mesh of ${name}`,
          fileUrl: child.fileUrl,
          lodLevel: 1, // Children default to LOD 1
          position: child.position,
          rotation: child.rotation,
          scale: child.scale,
          visible: true,
          sortOrder: 0,
          metadata: {},
          parent: savedParent,
        });
      });

      if (childrenEntities.length > 0) {
        await this.sceneRepository.save(childrenEntities);
      }

      // 5. Return the full tree
      return this.findOne(savedParent.id);
    } catch (error) {
      // If something fails, cleanup the parent scene entity
      await this.sceneRepository.remove(parentScene);
      throw error;
    }
  }

  async confirmPlacement(
    id: string,
    placement: {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      scale?: { x: number; y: number; z: number };
    },
  ) {
    const parent = await this.sceneRepository.findOne({
      where: { id },
      relations: { children: true },
    });
    
    if (!parent) {
      throw new NotFoundException(`Scene ${id} not found`);
    }

    // 1. Cập nhật vị trí và góc xoay của parent
    parent.position = placement.position;
    parent.rotation = placement.rotation;
    if (placement.scale) {
      parent.scale = placement.scale;
    }

    // 2. Không cần thay đổi local offset của children vì chúng luôn relative với parent.
    // Việc tính toán tọa độ thế giới (absolute) sẽ do frontend đảm nhiệm thông qua tính offset + rotation của parent.
    
    const saved = await this.sceneRepository.save(parent);
    return this.findOne(saved.id);
  }

  async remove(id: string) {
    const scene = await this.sceneRepository.findOne({ where: { id } });
    if (!scene) {
      throw new NotFoundException(`Scene ${id} not found`);
    }
    await this.sceneRepository.remove(scene);
    return { deleted: true };
  }
}
