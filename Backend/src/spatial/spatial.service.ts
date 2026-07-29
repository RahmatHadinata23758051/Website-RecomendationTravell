import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetNearbyDestinationsDto } from './dto/get-nearby-destinations.dto';

export interface SpatialLocation {
  id: string;
  name: string;
  category: string;
  city_or_regency: string;
  latitude: number;
  longitude: number;
  rating: number;
}

@Injectable()
export class SpatialService {
  private readonly logger = new Logger(SpatialService.name);

  // Master Spatial Dataset for Lampung Attractions
  private readonly lampungDestinations: SpatialLocation[] = [
    {
      id: 'dest-001',
      name: 'Pantai Mutun',
      category: 'beach',
      city_or_regency: 'Kabupaten Pesawaran',
      latitude: -5.5123,
      longitude: 105.2512,
      rating: 4.8,
    },
    {
      id: 'dest-002',
      name: 'Pantai Bensam',
      category: 'beach',
      city_or_regency: 'Kabupaten Pesawaran',
      latitude: -5.5034,
      longitude: 105.2530,
      rating: 4.9,
    },
    {
      id: 'dest-003',
      name: 'Pulau Pahawang',
      category: 'island',
      city_or_regency: 'Kabupaten Pesawaran',
      latitude: -5.6701,
      longitude: 105.2210,
      rating: 4.9,
    },
    {
      id: 'dest-004',
      name: 'Taman Nasional Way Kambas',
      category: 'nature',
      city_or_regency: 'Kabupaten Lampung Timur',
      latitude: -4.9214,
      longitude: 105.7821,
      rating: 4.9,
    },
    {
      id: 'dest-005',
      name: 'Camp Ground Gunung Pesagi',
      category: 'mountain',
      city_or_regency: 'Kabupaten Lampung Barat',
      latitude: -4.9120,
      longitude: 104.1201,
      rating: 4.7,
    },
    {
      id: 'dest-006',
      name: 'Menara Siger',
      category: 'landmark',
      city_or_regency: 'Kabupaten Lampung Selatan',
      latitude: -5.8712,
      longitude: 105.7510,
      rating: 4.8,
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async findNearbyDestinations(dto: GetNearbyDestinationsDto) {
    const { latitude, longitude, radius_km = 10, top_k = 10, category } = dto;

    this.logger.log(
      `[SPATIAL QUERY] Radius search at (${latitude}, ${longitude}) with radius ${radius_km} km`,
    );

    let candidates = this.lampungDestinations;

    if (category) {
      candidates = candidates.filter(
        (item) => item.category.toLowerCase() === category.toLowerCase(),
      );
    }

    const calculated = candidates
      .map((dest) => {
        const distanceKm = this.calculateHaversineDistanceKm(
          latitude,
          longitude,
          dest.latitude,
          dest.longitude,
        );

        // Estimate travel time: average 40 km/h drive speed in coastal/mountainous Lampung roads
        const estimatedDriveMins = Math.round((distanceKm / 40) * 60);

        return {
          ...dest,
          distance_km: Number(distanceKm.toFixed(2)),
          estimated_drive_mins: Math.max(estimatedDriveMins, 1),
        };
      })
      .filter((dest) => dest.distance_km <= radius_km)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, top_k);

    return {
      status: 'success',
      origin: { latitude, longitude },
      radius_km,
      total_found: calculated.length,
      nearby_destinations: calculated,
    };
  }

  async calculatePointDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const distanceKm = this.calculateHaversineDistanceKm(lat1, lon1, lat2, lon2);
    const estimatedDriveMins = Math.round((distanceKm / 40) * 60);

    return {
      status: 'success',
      origin: { latitude: lat1, longitude: lon1 },
      destination: { latitude: lat2, longitude: lon2 },
      distance_km: Number(distanceKm.toFixed(2)),
      estimated_drive_mins: Math.max(estimatedDriveMins, 1),
    };
  }

  private calculateHaversineDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's mean radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
