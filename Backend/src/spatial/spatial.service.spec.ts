import { Test, TestingModule } from '@nestjs/testing';
import { SpatialService } from './spatial.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SpatialService', () => {
  let service: SpatialService;

  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpatialService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SpatialService>(SpatialService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate nearby destinations within 15km radius of Bandar Lampung / Pesawaran beaches', async () => {
    const result = await service.findNearbyDestinations({
      latitude: -5.5100,
      longitude: 105.2500,
      radius_km: 15,
    });

    expect(result.status).toBe('success');
    expect(result.nearby_destinations.length).toBeGreaterThan(0);
    expect(result.nearby_destinations[0].name).toBe('Pantai Mutun');
    expect(result.nearby_destinations[0].distance_km).toBeLessThan(5);
  });

  it('should calculate distance between two points accurately via Haversine formula', async () => {
    const res = await service.calculatePointDistance(-5.5100, 105.2500, -5.5034, 105.2530);
    expect(res.status).toBe('success');
    expect(res.distance_km).toBeLessThan(2);
    expect(res.estimated_drive_mins).toBeGreaterThanOrEqual(1);
  });
});
