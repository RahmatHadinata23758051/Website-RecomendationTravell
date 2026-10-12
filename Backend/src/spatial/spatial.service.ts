import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
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
export class SpatialService implements OnModuleInit {
  private readonly logger = new Logger(SpatialService.name);
  private destinations: SpatialLocation[] = [];

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.loadCatalog();
  }

  private loadCatalog(): void {
    const candidates = [
      path.join(process.cwd(), '..', 'Frontend', 'public', 'assets', 'data', 'public_destinations.json'),
      path.join(process.cwd(), '..', 'Frontend', 'public', 'data', 'destinations.json'),
      path.join(process.cwd(), 'public', 'assets', 'data', 'public_destinations.json'),
      path.join(__dirname, '..', '..', '..', 'Frontend', 'public', 'assets', 'data', 'public_destinations.json'),
    ];

    const target = candidates.find((c) => fs.existsSync(c));
    if (!target) {
      this.logger.warn('[SPATIAL] public_destinations.json not found; nearby searches will return empty');
      this.destinations = [];
      return;
    }

    try {
      const raw = JSON.parse(fs.readFileSync(target, 'utf-8'));
      const list = Array.isArray(raw) ? raw : raw.destinations || raw.data || [];
      this.destinations = list
        .filter((d: any) => typeof d.latitude === 'number' && typeof d.longitude === 'number' && d.name)
        .map((d: any) => ({
          id: String(d.canonical_id || d.id),
          name: String(d.name),
          category: String(d.primary_category || d.category || 'other'),
          city_or_regency: String(d.city_or_regency || ''),
          latitude: Number(d.latitude),
          longitude: Number(d.longitude),
          rating: typeof d.rating === 'number' ? d.rating : 4.5,
        }));
      this.logger.log(`[SPATIAL] Loaded ${this.destinations.length} real locations from ${target}`);
    } catch (err) {
      this.logger.error(`[SPATIAL] Failed loading locations: ${err instanceof Error ? err.message : String(err)}`);
      this.destinations = [];
    }
  }

  getAllDestinations(): SpatialLocation[] {
    if (this.destinations.length === 0) this.loadCatalog();
    return this.destinations;
  }

  async findNearbyDestinations(dto: GetNearbyDestinationsDto) {
    const { latitude, longitude, radius_km = 10, top_k = 10, category } = dto;

    if (this.destinations.length === 0) this.loadCatalog();

    this.logger.log(
      `[SPATIAL QUERY] Radius search at (${latitude}, ${longitude}) with radius ${radius_km} km`,
    );

    let candidates = this.destinations;

    if (category) {
      const catLower = category.toLowerCase();
      candidates = candidates.filter(
        (item) => item.category.toLowerCase() === catLower,
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
    const R = 6371;
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
