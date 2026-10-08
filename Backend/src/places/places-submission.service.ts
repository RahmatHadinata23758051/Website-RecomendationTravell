import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmissionDedupService } from './submission-dedup.service';
import { SubmitPlaceDto } from './dto/submit-place.dto';
import { MySubmissionsDto, QuerySubmissionsDto } from './dto/query-submissions.dto';
import { Prisma, PlaceSubmissionStatus } from '@prisma/client';

@Injectable()
export class PlacesSubmissionService {
  private readonly logger = new Logger(PlacesSubmissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dedupService: SubmissionDedupService,
  ) {}

  async submitPlace(
    userId: string,
    dto: SubmitPlaceDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const dedupResult = await this.dedupService.checkDuplicate(
      dto.cityRegency,
      dto.name,
      dto.latitude,
      dto.longitude,
    );

    if (dedupResult.isDuplicate) {
      if (dedupResult.existingCanonicalId) {
        throw new ConflictException({
          message: 'Destinasi wisata ini sudah terdaftar di katalog utama Lampung',
          duplicateOfId: dedupResult.existingCanonicalId,
          confidence: dedupResult.confidence,
          matchedField: dedupResult.matchedField,
        });
      } else {
        throw new ConflictException({
          message: 'Pengajuan untuk tempat wisata ini sudah ada dalam antrean moderasi',
          duplicateOfId: dedupResult.existingSubmissionId,
          confidence: dedupResult.confidence,
          matchedField: dedupResult.matchedField,
        });
      }
    }

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

  async getSubmissionById(id: string, userId?: string, isAdmin = false) {
    const submission = await this.prisma.placeSubmission.findUnique({
      where: { id },
      include: {
        submitter: { select: { id: true, fullName: true, avatarUrl: true } },
        moderator: { select: { id: true, fullName: true, avatarUrl: true } },
        votes: true,
        comments: {
          where: isAdmin ? {} : { isInternal: false },
          include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!submission) throw new NotFoundException('Submission not found');

    if (!isAdmin && submission.status !== 'APPROVED' && submission.submitterId !== userId) {
      throw new ForbiddenException('You are not allowed to view this submission');
    }

    return submission;
  }

  // Admin moderation methods
  async getModerationQueue(query: QuerySubmissionsDto) {
    const { status, cityRegency, source, page = 1, limit = 20, sortBy = 'submittedAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PlaceSubmissionWhereInput = {};
    if (status) where.status = status;
    if (cityRegency) where.cityRegency = cityRegency;
    if (source) where.source = source;

    const [items, total] = await Promise.all([
      this.prisma.placeSubmission.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          submitter: { select: { id: true, fullName: true, avatarUrl: true } },
          _count: { select: { votes: true, comments: true } },
        },
      }),
      this.prisma.placeSubmission.count({ where }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSubmissionDetailForAdmin(id: string) {
    return this.getSubmissionById(id, undefined, true);
  }

  async moderateSubmission(
    submissionId: string,
    moderatorId: string,
    action: 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'MARK_DUPLICATE',
    notes?: string,
    rejectionReason?: string,
    duplicateOfId?: string,
  ) {
    const submission = await this.prisma.placeSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) throw new NotFoundException('Submission not found');

    const newStatus = this.getNewStatus(action);
    const updateData: Prisma.PlaceSubmissionUpdateInput = {
      status: newStatus,
      moderator: { connect: { id: moderatorId } },
      moderationNotes: notes,
      reviewedAt: new Date(),
    };

    if (action === 'REJECT') {
      if (!rejectionReason) throw new BadRequestException('Alasan penolakan diperlukan');
      updateData.rejectionReason = rejectionReason;
    }

    if (action === 'MARK_DUPLICATE') {
      if (!duplicateOfId) throw new BadRequestException('ID duplikat diperlukan');
      updateData.duplicateOfId = duplicateOfId;
      updateData.status = PlaceSubmissionStatus.DUPLICATE;
    }

    const updated = await this.prisma.placeSubmission.update({
      where: { id: submissionId },
      data: updateData,
    });

    this.logger.log(`Submission ${submissionId} moderated by ${moderatorId}: ${action}`);
    return updated;
  }

  private getNewStatus(action: string): PlaceSubmissionStatus {
    switch (action) {
      case 'APPROVE':
        return PlaceSubmissionStatus.APPROVED;
      case 'REJECT':
        return PlaceSubmissionStatus.REJECTED;
      case 'REQUEST_INFO':
        return PlaceSubmissionStatus.NEEDS_MORE_INFO;
      case 'MARK_DUPLICATE':
        return PlaceSubmissionStatus.DUPLICATE;
      default:
        return PlaceSubmissionStatus.UNDER_REVIEW;
    }
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