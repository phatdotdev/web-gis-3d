import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync, unlinkSync } from 'fs';
import type { Multer } from 'multer';
import { ScenesService } from './scenes.service';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';

const sceneUploadInterceptor = FileInterceptor('file', {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const dir = join(process.cwd(), 'uploads', 'temp');
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const extension = extname(file.originalname).toLowerCase();
      cb(null, `temp-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const extension = extname(file.originalname).toLowerCase();
    if (extension === '.glb' || extension === '.gltf') {
      cb(null, true);
      return;
    }
    cb(new BadRequestException('Only .glb or .gltf files are allowed'), false);
  },
  limits: { fileSize: 100 * 1024 * 1024 },
});

@Controller('scenes')
export class ScenesController {
  constructor(private readonly scenesService: ScenesService) {}

  @Post()
  create(@Body() createSceneDto: CreateSceneDto) {
    return this.scenesService.create(createSceneDto);
  }

  @Post('upload-and-split')
  @UseInterceptors(sceneUploadInterceptor)
  async uploadAndSplit(
    @UploadedFile() file: Multer.File,
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!name) {
      throw new BadRequestException('Name is required');
    }

    try {
      const result = await this.scenesService.createSplitScene(
        name,
        description || null,
        file.path,
      );
      try {
        unlinkSync(file.path);
      } catch (err) {}
      return result;
    } catch (error) {
      try {
        unlinkSync(file.path);
      } catch (err) {}
      throw error;
    }
  }

  @Post('upload-and-place')
  @UseInterceptors(sceneUploadInterceptor)
  async uploadAndPlace(
    @UploadedFile() file: Multer.File,
    @Body('name') name: string,
    @Body('longitude') longitudeStr: string,
    @Body('latitude') latitudeStr: string,
    @Body('elevation') elevationStr: string,
    @Body('heading') headingStr: string,
    @Body('description') description?: string,
    @Body('scale') scaleStr?: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!name) throw new BadRequestException('Name is required');

    const longitude = parseFloat(longitudeStr);
    const latitude = parseFloat(latitudeStr);
    const elevation = parseFloat(elevationStr);
    const heading = parseFloat(headingStr);
    const scale = scaleStr ? parseFloat(scaleStr) : undefined;

    if (isNaN(longitude) || isNaN(latitude) || isNaN(elevation) || isNaN(heading)) {
      try { unlinkSync(file.path); } catch (e) {}
      throw new BadRequestException('Invalid coordinates or heading');
    }

    try {
      const result = await this.scenesService.createAndPlaceScene(
        name,
        description || null,
        file.path,
        { longitude, latitude, elevation, heading, scale }
      );
      try {
        unlinkSync(file.path);
      } catch (err) {}
      return result;
    } catch (error) {
      try {
        unlinkSync(file.path);
      } catch (err) {}
      throw error;
    }
  }

  @Post(':id/upload-and-split-children')
  @UseInterceptors(sceneUploadInterceptor)
  async uploadAndSplitChildren(
    @Param('id') id: string,
    @UploadedFile() file: Multer.File,
    @Body('name') name?: string,
    @Body('description') description?: string,
    @Body('replaceExisting') replaceExisting?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      const result = await this.scenesService.splitSceneChildren(
        id,
        file.path,
        {
          name: name || null,
          description: description || null,
          replaceExisting: replaceExisting === 'true',
        },
      );
      try {
        unlinkSync(file.path);
      } catch (err) {}
      return result;
    } catch (error) {
      try {
        unlinkSync(file.path);
      } catch (err) {}
      throw error;
    }
  }

  @Post(':id/split')
  splitExistingNode(
    @Param('id') id: string,
    @Body('name') name?: string,
    @Body('description') description?: string,
    @Body('replaceExisting') replaceExisting?: boolean,
  ) {
    return this.scenesService.splitExistingSceneChildren(id, {
      name: name || null,
      description: description || null,
      replaceExisting: replaceExisting === true,
    });
  }

  @Get()
  findAll(@Query('lodLevel') lodLevel?: string) {
    if (lodLevel !== undefined) {
      return this.scenesService.findByLodLevel(parseInt(lodLevel, 10));
    }
    return this.scenesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scenesService.findOne(id);
  }

  @Get(':id/children')
  findChildren(
    @Param('id') id: string,
    @Query('minLod') minLod?: string,
  ) {
    const minLodNum = minLod !== undefined ? parseInt(minLod, 10) : undefined;
    return this.scenesService.findChildrenByParentId(id, minLodNum);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSceneDto: UpdateSceneDto) {
    return this.scenesService.update(id, updateSceneDto);
  }

  @Patch(':id/transform')
  updateTransform(
    @Param('id') id: string,
    @Body() transform: {
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: { x: number; y: number; z: number };
    },
  ) {
    return this.scenesService.updateTransform(id, transform);
  }

  @Post(':id/confirm-placement')
  confirmPlacement(
    @Param('id') id: string,
    @Body() placement: {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
    },
  ) {
    return this.scenesService.confirmPlacement(id, placement);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scenesService.remove(id);
  }
}
