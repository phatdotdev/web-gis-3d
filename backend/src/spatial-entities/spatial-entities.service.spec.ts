import { Test, TestingModule } from '@nestjs/testing';
import { SpatialEntitiesService } from './spatial-entities.service';

describe('SpatialEntitiesService', () => {
  let service: SpatialEntitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpatialEntitiesService],
    }).compile();

    service = module.get<SpatialEntitiesService>(SpatialEntitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
