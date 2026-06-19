import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Model3D } from './entities/model-3d.entity';
import { Model3DController } from './model-3d.controller';
import { Model3DService } from './model-3d.service';

@Module({
  imports: [TypeOrmModule.forFeature([Model3D])],
  controllers: [Model3DController],
  providers: [Model3DService],
})
export class Model3DModule {}
