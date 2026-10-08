import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpatialService, SpatialLocation } from '../spatial/spatial.service';
import { Prisma } from '@prisma/client';

interface DedupResult {
  isDuplicate: boolean;
  existingCanonicalId?: string;
  existingSubmissionId?: string;
  confidence: number;
  matchedField: string;
}

@Injectable()
export class SubmissionDedupService {
  private readonly logger = new Logger(SubmissionDedupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly spatialService: SpatialService,
  ) {}

  async checkDuplicate(
    cityRegency: string,
    name: string,
    latitude: number,
    longitude: number,
  ): Promise<DedupResult> {
    const normalizedName = this.normalizeName(name);

    const exactMatch = this.checkCanonicalExactMatch(
      cityRegency,
      normalizedName,
      latitude,
      longitude,
    );
    if (exactMatch) {
      this.logger.warn(
        `Exact duplicate detected: ${name} in ${cityRegency} matches ${exactMatch.id} (confidence 0.99)`,
      );
      return {
        isDuplicate: true,
        existingCanonicalId: exactMatch.id,
        confidence: 0.99,
        matchedField: 'exact_name_location',
      };
    }

    const fuzzyMatch = await this.checkCanonicalFuzzyMatch(
      cityRegency,
      normalizedName,
      latitude,
      longitude,
    );
    if (fuzzyMatch) {
      this.logger.warn(
        `Fuzzy duplicate detected: ${name} in ${cityRegency} matches ${fuzzyMatch.id} (confidence ${fuzzyMatch.confidence.toFixed(2)})`,
      );
      return {
        isDuplicate: true,
        existingCanonicalId: fuzzyMatch.id,
        confidence: fuzzyMatch.confidence,
        matchedField: 'fuzzy_name_location',
      };
    }

    const pendingMatch = await this.checkPendingSubmissions(
      cityRegency,
      normalizedName,
    );
    if (pendingMatch) {
      this.logger.warn(
        `Pending duplicate detected: ${name} in ${cityRegency} matches pending submission ${pendingMatch.id}`,
      );
      return {
        isDuplicate: true,
        existingSubmissionId: pendingMatch.id,
        confidence: 0.9,
        matchedField: 'pending_submission',
      };
    }

    return { isDuplicate: false, confidence: 0, matchedField: 'none' };
  }

  private checkCanonicalExactMatch(
    cityRegency: string,
    normalizedName: string,
    latitude: number,
    longitude: number,
  ): SpatialLocation | null {
    const canonical = this.spatialService.getAllDestinations();
    const candidates = canonical.filter(
      (d) =>
        d.city_or_regency === cityRegency &&
        this.normalizeName(d.name) === normalizedName &&
        this.haversineKm(latitude, longitude, d.latitude, d.longitude) < 0.2,
    );
    return candidates[0] ?? null;
  }

  private async checkCanonicalFuzzyMatch(
    cityRegency: string,
    normalizedName: string,
    latitude: number,
    longitude: number,
  ): Promise<{ id: string; confidence: number } | null> {
    const canonical = this.spatialService.getAllDestinations();
    const candidates = canonical.filter((d) => d.city_or_regency === cityRegency);

    let bestMatch: { id: string; confidence: number } | null = null;
    let bestScore = 0;

    for (const d of candidates) {
      const distanceKm = this.haversineKm(latitude, longitude, d.latitude, d.longitude);
      if (distanceKm > 0.5) continue;

      const nameSimilarity = this.levenshteinRatio(normalizedName, this.normalizeName(d.name));
      if (nameSimilarity < 0.85) continue;

      const spatialScore = 1 - distanceKm / 0.5;
      const combinedConfidence = (nameSimilarity + spatialScore) / 2;

      if (combinedConfidence > bestScore) {
        bestScore = combinedConfidence;
        bestMatch = { id: d.id, confidence: combinedConfidence };
      }
    }

    return bestScore >= 0.85 ? bestMatch : null;
  }

  private async checkPendingSubmissions(
    cityRegency: string,
    normalizedName: string,
  ): Promise<{ id: string } | null> {
    const pending = await this.prisma.placeSubmission.findFirst({
      where: {
        cityRegency,
        normalizedName,
        status: { in: ['PENDING', 'UNDER_REVIEW'] },
      },
      select: { id: true },
    });
    return pending ?? null;
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  private levenshteinRatio(a: string, b: string): number {
    if (a.length === 0) return b.length === 0 ? 1 : 0;
    if (b.length === 0) return 0;

    const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
      Array(b.length + 1).fill(0),
    );
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }

    const distance = matrix[a.length][b.length];
    const maxLen = Math.max(a.length, b.length);
    return 1 - distance / maxLen;
  }

  private haversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}