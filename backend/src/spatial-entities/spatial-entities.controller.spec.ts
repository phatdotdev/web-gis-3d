import { Test, TestingModule } from '@nestjs/testing';
import { SpatialEntitiesController } from './spatial-entities.controller';
import { SpatialEntitiesService } from './spatial-entities.service';

describe('SpatialEntitiesController', () => {
  let controller: SpatialEntitiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpatialEntitiesController],
      providers: [SpatialEntitiesService],
    }).compile();

    controller = module.get<SpatialEntitiesController>(
      SpatialEntitiesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
