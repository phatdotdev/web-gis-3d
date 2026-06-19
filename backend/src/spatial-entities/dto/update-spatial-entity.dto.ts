import { PartialType } from '@nestjs/mapped-types';
import { CreateSpatialEntityDto } from './create-spatial-entity.dto';

export class UpdateSpatialEntityDto extends PartialType(
  CreateSpatialEntityDto,
) {}
