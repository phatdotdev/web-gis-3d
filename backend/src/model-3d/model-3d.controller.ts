import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';
import type { Multer } from 'multer';
import { Model3DService } from './model-3d.service';
import { CreateModel3DDto } from './dto/create-model-3d.dto';
import { UpdateModel3DDto } from './dto/update-model-3d.dto';

const modelUploadInterceptor = FileInterceptor('file', {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const dir = join(process.cwd(), 'uploads', 'models');
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const extension = extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
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
  limits: { fileSize: 50 * 1024 * 1024 },
});

@Controller('models')
export class Model3DController {
  constructor(private readonly model3DService: Model3DService) {}

  @Post()
  create(@Body() createModelDto: CreateModel3DDto) {
    return this.model3DService.create(createModelDto);
  }

  @Post('upload')
  @UseInterceptors(modelUploadInterceptor)
  upload(@UploadedFile() file: Multer.File, @Body() payload: Partial<CreateModel3DDto>) {
    return this.model3DService.createFromUpload(file, payload);
  }

  @Get()
  findAll() {
    return this.model3DService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.model3DService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateModelDto: UpdateModel3DDto) {
    return this.model3DService.update(id, updateModelDto);
  }

  @Post(':id/upload')
  @UseInterceptors(modelUploadInterceptor)
  attachFile(@Param('id') id: string, @UploadedFile() file: Multer.File) {
    return this.model3DService.attachFile(id, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.model3DService.remove(id);
  }
}
