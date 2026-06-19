import { PartialType } from '@nestjs/mapped-types';
import { CreateModel3DDto } from './create-model-3d.dto';

export class UpdateModel3DDto extends PartialType(CreateModel3DDto) {}
