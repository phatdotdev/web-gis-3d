import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { SpatialEntitiesService } from './spatial-entities.service';
import { CreateSpatialEntityDto } from './dto/create-spatial-entity.dto';
import { UpdateSpatialEntityDto } from './dto/update-spatial-entity.dto';
import type { Multer } from 'multer';

@Controller('spatial-entities')
export class SpatialEntitiesController {
  constructor(
    private readonly spatialEntitiesService: SpatialEntitiesService,
  ) {}

  @Post()
  create(@Body() createSpatialEntityDto: CreateSpatialEntityDto) {
    return this.spatialEntitiesService.create(createSpatialEntityDto);
  }

  @Post(':id/upload-model')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'models');
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const extension = extname(file.originalname).toLowerCase();
          const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
          cb(null, safeName);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const extension = extname(file.originalname).toLowerCase();
        if (extension === '.glb' || extension === '.gltf') {
          cb(null, true);
          return;
        }
        cb(
          new BadRequestException('Only .glb or .gltf files are allowed'),
          false,
        );
      },
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  uploadModel(@Param('id') id: string, @UploadedFile() file: Multer.File) {
    return this.spatialEntitiesService.attachModel(id, file);
  }

  @Get()
  findAll(@Query('layerId') layerId?: string) {
    return this.spatialEntitiesService.findAll(layerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.spatialEntitiesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSpatialEntityDto: UpdateSpatialEntityDto,
  ) {
    return this.spatialEntitiesService.update(id, updateSpatialEntityDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.spatialEntitiesService.remove(id);
  }

  @Post(':id/upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const entityId = req.params.id;
          const dir = join(process.cwd(), 'uploads', 'images', entityId);
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const extension = extname(file.originalname).toLowerCase();
          const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
          cb(null, safeName);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const extension = extname(file.originalname).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
          cb(null, true);
          return;
        }
        cb(
          new BadRequestException('Only image files (jpg, png, webp, gif) are allowed'),
          false,
        );
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadImage(@Param('id') id: string, @UploadedFile() file: Multer.File) {
    return this.spatialEntitiesService.attachImage(id, file);
  }

  @Delete(':id/images/:filename')
  removeImage(
    @Param('id') id: string,
    @Param('filename') filename: string,
  ) {
    return this.spatialEntitiesService.removeImage(id, filename);
  }
}
