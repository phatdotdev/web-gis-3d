/* eslint-disable */
import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { LayersService } from './layers.service';
import { CreateLayerDto } from './dto/create-layer.dto';
import { UpdateLayerDto } from './dto/update-layer.dto';
import { ImportPreviewDto } from './dto/import-preview.dto';
import { LayerImportService } from './services/layer-import.service';
import type { Multer } from 'multer';

@Controller('layers')
export class LayersController {
  constructor(
    private readonly layersService: LayersService,
    private readonly layerImportService: LayerImportService,
  ) { }

  private async writeFeatureCollection(res: Response, collection: any) {
    const features = Array.isArray(collection?.features) ? collection.features : [];
    res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
    res.write('{"type":"FeatureCollection","features":[');

    for (let i = 0; i < features.length; i += 1) {
      const chunk = `${i === 0 ? '' : ','}${JSON.stringify(features[i])}`;
      if (!res.write(chunk)) {
        await new Promise((resolve) => res.once('drain', resolve));
      }
    }

    res.end(']}');
  }

  @Post()
  create(@Body() createLayerDto: CreateLayerDto) {
    return this.layersService.create(createLayerDto);
  }

  @Post('import/preview')
  previewImport(@Body() payload: ImportPreviewDto) {
    return this.layerImportService.previewSourceUrl(payload.sourceUrl);
  }

  @Post('upload-geojson')
  @UseInterceptors(FileInterceptor('file'))
  uploadGeoJson(
    @UploadedFile() file: Multer.File,
    @Body() payload: Partial<CreateLayerDto>,
  ) {
    return this.layersService.createFromGeoJson(file, payload);
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
    return this.layersService.attachModel(id, file);
  }

  @Post(':id/upload-icon')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'icons');
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
        if (
          extension === '.png' ||
          extension === '.jpg' ||
          extension === '.jpeg' ||
          extension === '.webp' ||
          extension === '.svg'
        ) {
          cb(null, true);
          return;
        }
        cb(
          new BadRequestException(
            'Only .png, .jpg, .jpeg, .webp, .svg files are allowed',
          ),
          false,
        );
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadIcon(@Param('id') id: string, @UploadedFile() file: Multer.File) {
    return this.layersService.attachIcon(id, file);
  }

  @Get()
  findAll() {
    return this.layersService.findAll();
  }

  @Get(':id/geojson')
  async getGeoJson(@Param('id') id: string, @Res() res: Response) {
    const collection = await this.layersService.getFeatureCollection(id, 'features');
    await this.writeFeatureCollection(res, collection);
  }

  @Get(':id/vertices.geojson')
  async getVertexGeoJson(@Param('id') id: string, @Res() res: Response) {
    const collection = await this.layersService.getFeatureCollection(id, 'vertices');
    await this.writeFeatureCollection(res, collection);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.layersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLayerDto: UpdateLayerDto) {
    return this.layersService.update(id, updateLayerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.layersService.remove(id);
  }
}
