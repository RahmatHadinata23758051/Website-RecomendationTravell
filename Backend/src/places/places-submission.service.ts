import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitPlaceDto } from './dto/submit-place.dto';
import { MySubmissionsDto, QuerySubmissionsDto } from './dto/query-submissions.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PlacesSubmissionService {
  private readonly logger = new Logger(PlacesSubmissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async submitPlace(
    userId: string,
    dto: SubmitPlaceDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const submission = await this.prisma.placeSubmission.create({
      data: {
        submitterId: userId,
        name: dto.name.trim(),
        normalizedName: this.normalizeName(dto.name),
        category: dto.category,
        categoryTags: dto.categoryTags ?? [],
        address: dto.address.trim(),
        cityRegency: dto.cityRegency,
        district: dto.district,
        village: dto.village,
        latitude: dto.latitude,
        longitude: dto.longitude,
        phone: dto.phone,
        website: dto.website,
        description: dto.description,
        openingHours: dto.openingHours,
        priceMin: dto.priceMin,
        priceMax: dto.priceMax,
        currency: dto.currency ?? 'IDR',
        facilities: dto.facilities ?? [],
        primaryPhotoUrl: dto.primaryPhotoUrl,
        photos: dto.photos,
        ownershipProof: dto.ownershipProof,
        isVerifiedOwner: !!dto.ownershipProof,
        ipAddress,
        userAgent,
      },
    });

    this.logger.log(`Created place submission ${submission.id} for user ${userId}`);
    return submission;
  }

  async getMySubmissions(userId: string, query: MySubmissionsDto) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.PlaceSubmissionWhereInput = { submitterId: userId };

    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.placeSubmission.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.placeSubmission.count({ where }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPublicSubmissions(query: QuerySubmissionsDto) {
    const { cityRegency, source, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.PlaceSubmissionWhereInput = {
      status: 'APPROVED',
    };

    if (cityRegency) where.cityRegency = cityRegency;
    if (source) where.source = source;

    const [items, total] = await Promise.all([
      this.prisma.placeSubmission.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
        include: {
          submitter: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      }),
      this.prisma.placeSubmission.count({ where }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSubmissionById(id: string, userId?: string) {
    const submission = await this.prisma.placeSubmission.findUnique({
      where: { id },
      include: {
        submitter: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    if (!submission) throw new NotFoundException('Submission not found');

    if (submission.status !== 'APPROVED' && submission.submitterId !== userId) {
      throw new ForbiddenException('You are not allowed to view this submission');
    }

    return submission;
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
}