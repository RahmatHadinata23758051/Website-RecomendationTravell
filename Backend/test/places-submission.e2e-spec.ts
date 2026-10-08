import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { of } from 'rxjs';
import helmet from 'helmet';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';

jest.setTimeout(30000);

describe('Place submission to ML recommendation catalog (e2e)', () => {
  let app: INestApplication;
  let submitterToken: string;
  let adminToken: string;
  let submissionId: string;

  const submitter = {
    id: 'place-submit-user',
    email: 'place-submit-user@example.com',
    fullName: 'Place Submitter',
    role: 'USER',
    xp: 0,
  };
  const admin = {
    id: 'place-submit-admin',
    email: 'place-submit-admin@example.com',
    fullName: 'Place Submission Admin',
    role: 'ADMIN',
    xp: 0,
  };

  const submissions = new Map<string, any>();
  const activities: any[] = [];
  const users = new Map([
    [submitter.id, submitter],
    [admin.id, admin],
  ]);

  const mlPost = jest.fn().mockImplementation(() =>
    of({ status: 201, data: { accepted: true } }),
  );

  const mockPrismaService = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const user = where.id ? users.get(where.id) : undefined;
        return Promise.resolve(user ? { ...user, createdAt: new Date() } : null);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const user = users.get(where.id);
        if (user && data.xp?.increment) user.xp += data.xp.increment;
        return Promise.resolve(user);
      }),
    },
    userActivity: {
      findFirst: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(
          activities.find(
            (activity) =>
              activity.userId === where.userId &&
              activity.action === where.action &&
              activity.title === where.title,
          ) ?? null,
        ),
      ),
      create: jest.fn().mockImplementation(({ data }) => {
        const activity = { id: `activity-${activities.length + 1}`, ...data };
        activities.push(activity);
        return Promise.resolve(activity);
      }),
    },
    placeSubmission: {
      create: jest.fn().mockImplementation(({ data }) => {
        const id = 'submission-place-001';
        const submission = {
          id,
          ...data,
          status: 'PENDING',
          source: 'USER',
          canonicalId: null,
          promotedAt: null,
          promotionError: null,
          submittedAt: new Date(),
          updatedAt: new Date(),
        };
        submissions.set(id, submission);
        return Promise.resolve(submission);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const pending = [...submissions.values()].find(
          (submission) =>
            submission.cityRegency === where.cityRegency &&
            submission.normalizedName === where.normalizedName &&
            ['PENDING', 'UNDER_REVIEW'].includes(submission.status),
        );
        return Promise.resolve(pending ? { id: pending.id } : null);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(submissions.get(where.id) ?? null),
      ),
      findMany: jest.fn().mockImplementation(({ where }) => {
        const items = [...submissions.values()].filter((submission) => {
          if (where?.status && submission.status !== where.status) return false;
          if (where?.submitterId && submission.submitterId !== where.submitterId) return false;
          if (where?.cityRegency && submission.cityRegency !== where.cityRegency) return false;
          return true;
        });
        return Promise.resolve(items);
      }),
      count: jest.fn().mockImplementation(({ where }) => {
        const items = [...submissions.values()].filter((submission) => {
          if (where?.status && submission.status !== where.status) return false;
          if (where?.submitterId && submission.submitterId !== where.submitterId) return false;
          if (where?.cityRegency && submission.cityRegency !== where.cityRegency) return false;
          return true;
        });
        return Promise.resolve(items.length);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const submission = submissions.get(where.id);
        if (!submission) return Promise.resolve(null);

        if (data.status) submission.status = data.status;
        if (data.moderator?.connect) submission.moderatorId = data.moderator.connect.id;
        for (const field of ['moderationNotes', 'rejectionReason', 'duplicateOfId']) {
          if (data[field] !== undefined) submission[field] = data[field];
        }
        if (data.canonicalId !== undefined) submission.canonicalId = data.canonicalId;
        if (data.promotedAt !== undefined) submission.promotedAt = data.promotedAt;
        if (data.promotionError !== undefined) submission.promotionError = data.promotionError;
        submission.updatedAt = new Date();
        return Promise.resolve(submission);
      }),
    },
  };

  const mockRedisService = {
    invalidateByPrefix: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .overrideProvider(HttpService)
      .useValue({ post: mlPost })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(helmet());
    app.enableCors({ origin: true, credentials: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    const jwtService = app.get(JwtService);
    const jwtOptions = { secret: 'super-secret-access-key-lampung-2026' };
    submitterToken = jwtService.sign(
      { sub: submitter.id, email: submitter.email, role: submitter.role },
      jwtOptions,
    );
    adminToken = jwtService.sign(
      { sub: admin.id, email: admin.email, role: admin.role },
      jwtOptions,
    );
  }, 30000);

  afterAll(async () => {
    await app?.close();
  });

  it('submits a place and exposes it in the admin moderation queue', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/places/submissions')
      .set('Authorization', `Bearer ${submitterToken}`)
      .send({
        name: 'Air Terjun E2E Kelumbayan',
        category: 'waterfall',
        categoryTags: ['nature', 'hidden-gem'],
        address: 'Pekon Kiluan Negeri, Kelumbayan',
        cityRegency: 'Kabupaten Tanggamus',
        district: 'Kelumbayan',
        village: 'Kiluan Negeri',
        latitude: -5.75,
        longitude: 105.1,
        description: 'Air terjun baru untuk pengujian alur katalog.',
        facilities: ['parking', 'toilet'],
        priceMin: 10000,
        priceMax: 15000,
      })
      .expect(201);

    submissionId = response.body.id;
    expect(submissionId).toBe('submission-place-001');
    expect(response.body.status).toBe('PENDING');

    const queueResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/places/submissions?status=PENDING')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(queueResponse.body.data).toHaveLength(1);
    expect(queueResponse.body.data[0]).toMatchObject({
      id: submissionId,
      name: 'Air Terjun E2E Kelumbayan',
      status: 'PENDING',
    });
    expect(queueResponse.body.meta.total).toBe(1);
  });

  it('approves the submission, promotes it to ML, and makes retry idempotent', async () => {
    const reviewResponse = await request(app.getHttpServer())
      .patch(`/api/v1/admin/places/submissions/${submissionId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'APPROVE',
        moderationNotes: 'Verified by the E2E moderation fixture.',
      })
      .expect(200);

    expect(reviewResponse.body.status).toBe('APPROVED');
    expect(submissions.get(submissionId)).toMatchObject({
      status: 'APPROVED',
      canonicalId: `dest-sub-${submissionId}`,
    });
    expect(submissions.get(submissionId).promotedAt).toBeInstanceOf(Date);
    expect(mlPost).toHaveBeenCalledTimes(1);
    expect(mlPost).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/catalog/submissions',
      expect.objectContaining({
        canonical_id: `dest-sub-${submissionId}`,
        name: 'Air Terjun E2E Kelumbayan',
        primary_category: 'waterfall',
      }),
      expect.objectContaining({ timeout: 5000 }),
    );

    const xpAfterApproval = submitter.xp;
    expect(xpAfterApproval).toBe(50);
    expect(activities).toHaveLength(1);

    const retryResponse = await request(app.getHttpServer())
      .patch(`/api/v1/admin/places/submissions/${submissionId}/promote`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(retryResponse.body.status).toBe('APPROVED');
    expect(retryResponse.body.canonicalId).toBe(`dest-sub-${submissionId}`);
    expect(retryResponse.body.promotedAt).toBeDefined();
    expect(mlPost).toHaveBeenCalledTimes(1);
    expect(submitter.xp).toBe(xpAfterApproval);
    expect(activities).toHaveLength(1);

    const secondRetryResponse = await request(app.getHttpServer())
      .patch(`/api/v1/admin/places/submissions/${submissionId}/promote`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(secondRetryResponse.body.canonicalId).toBe(`dest-sub-${submissionId}`);
    expect(mlPost).toHaveBeenCalledTimes(1);
    expect(submitter.xp).toBe(50);
    expect(activities).toHaveLength(1);
  });
});
