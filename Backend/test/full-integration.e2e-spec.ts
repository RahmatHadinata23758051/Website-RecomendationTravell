import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

jest.setTimeout(40000);

describe('Full Enterprise Integration Audit Suite (17 Endpoints)', () => {
  let app: INestApplication;
  let userToken: string;

  const validPasswordHash = bcrypt.hashSync('Password123!', 10);

  const mockUser = {
    id: 'user-audit-123',
    email: 'auditor@traveller-lampung.site',
    fullName: 'Auditor System',
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findUnique: jest.fn().mockImplementation((args) => {
        if (args.where.email === mockUser.email || args.where.id === mockUser.id) {
          return Promise.resolve({
            ...mockUser,
            passwordHash: validPasswordHash,
          });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockResolvedValue(mockUser),
    },
    userFavorite: {
      findUnique: jest.fn().mockImplementation((args) => {
        const canonicalId = args.where?.userId_canonicalId?.canonicalId;
        if (canonicalId === 'existing-fav' || canonicalId === 'dest-001') {
          return Promise.resolve({
            id: 'fav-001',
            userId: mockUser.id,
            canonicalId: canonicalId,
          });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockResolvedValue({
        id: 'fav-001',
        userId: mockUser.id,
        canonicalId: 'dest-001',
        createdAt: new Date(),
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'fav-001',
          userId: mockUser.id,
          canonicalId: 'dest-001',
          createdAt: new Date(),
        },
      ]),
      delete: jest.fn().mockResolvedValue({}),
    },
    itinerary: {
      create: jest.fn().mockImplementation((args) =>
        Promise.resolve({
          id: 'itin-001',
          userId: args.data.userId,
          title: args.data.title,
          shareToken: 'share-token-uuid-1234',
          daysJson: args.data.daysJson,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'itin-001',
          userId: mockUser.id,
          title: 'Audit Trip Lampung',
          shareToken: 'share-token-uuid-1234',
          daysJson: [{ day: 1 }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      findUnique: jest.fn().mockImplementation((args) => {
        if (args.where.shareToken === 'share-token-uuid-1234' || args.where.id === 'itin-001') {
          return Promise.resolve({
            id: 'itin-001',
            userId: mockUser.id,
            title: 'Audit Trip Lampung',
            shareToken: 'share-token-uuid-1234',
            daysJson: [{ day: 1 }],
            createdAt: new Date(),
            updatedAt: new Date(),
            user: { fullName: mockUser.fullName, email: mockUser.email },
          });
        }
        return Promise.resolve(null);
      }),
      delete: jest.fn().mockResolvedValue({}),
    },
    review: {
      create: jest.fn().mockImplementation((args) =>
        Promise.resolve({
          id: 'rev-001',
          userId: args.data.userId,
          canonicalId: args.data.canonicalId,
          rating: args.data.rating,
          reviewText: args.data.reviewText,
          sentimentLabel: args.data.sentimentLabel,
          sentimentScore: args.data.sentimentScore,
          createdAt: new Date(),
          user: { fullName: mockUser.fullName, email: mockUser.email },
        }),
      ),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'rev-001',
          userId: mockUser.id,
          canonicalId: 'dest-001',
          rating: 5,
          reviewText: 'Pantai luar biasa indah!',
          sentimentLabel: 'POSITIVE',
          sentimentScore: 0.95,
          createdAt: new Date(),
          user: { fullName: mockUser.fullName },
        },
      ]),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(helmet());
    app.use(cookieParser());
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
  }, 40000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // 1. Health check & Security
  it('1. GET /api/v1/health - System Health Check', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('healthy');
      });
  });

  // 2. Auth Module
  it('2. POST /api/v1/auth/register - User Registration', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'newuser@traveller-lampung.site',
        password: 'Password123!',
        fullName: 'New Traveller',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.statusCode).toBe(201);
        expect(res.body.data.accessToken).toBeDefined();
      });
  });

  it('3. POST /api/v1/auth/login - User Authentication & Cookie Set', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'auditor@traveller-lampung.site',
        password: 'Password123!',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.statusCode).toBe(200);
        expect(res.body.data.accessToken).toBeDefined();
        userToken = res.body.data.accessToken;
      });
  });

  it('4. GET /api/v1/auth/me - Protected User Profile Fetching', () => {
    return request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data.user.email).toBe(mockUser.email);
      });
  });

  it('5. POST /api/v1/auth/logout - User Logout & Clear Cookie', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .expect(200)
      .expect((res) => {
        expect(res.body.statusCode).toBe(200);
      });
  });

  // 3. Destinations Module & Redis Proxy
  it('6. POST /api/v1/destinations/recommendations - ML Proxy Recommendation Search', () => {
    return request(app.getHttpServer())
      .post('/api/v1/destinations/recommendations')
      .send({
        category: 'beach',
        top_k: 5,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.recommendations).toBeDefined();
        expect(res.body.cacheHit).toBeDefined();
      });
  });

  it('7. GET /api/v1/destinations/popular - Popular Destinations List', () => {
    return request(app.getHttpServer())
      .get('/api/v1/destinations/popular')
      .expect(200)
      .expect((res) => {
        expect(res.body.popular_destinations.length).toBeGreaterThan(0);
      });
  });

  it('8. GET /api/v1/destinations/hidden-gems - Hidden Gems List', () => {
    return request(app.getHttpServer())
      .get('/api/v1/destinations/hidden-gems')
      .expect(200)
      .expect((res) => {
        expect(res.body.hidden_gems.length).toBeGreaterThan(0);
      });
  });

  it('9. GET /api/v1/destinations/:id - Destination Details & Sentiment Summary', () => {
    return request(app.getHttpServer())
      .get('/api/v1/destinations/dest-001')
      .expect(200)
      .expect((res) => {
        expect(res.body.destination.name).toBe('Pantai Bensam');
      });
  });

  // 4. Spatial Module
  it('10. POST /api/v1/spatial/nearby - Haversine Radius Search', () => {
    return request(app.getHttpServer())
      .post('/api/v1/spatial/nearby')
      .send({
        latitude: -5.5100,
        longitude: 105.2500,
        radius_km: 15,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.nearby_destinations.length).toBeGreaterThan(0);
      });
  });

  it('11. GET /api/v1/spatial/distance - Point-to-Point Distance Calculation', () => {
    return request(app.getHttpServer())
      .get('/api/v1/spatial/distance?lat1=-5.5100&lon1=105.2500&lat2=-5.5034&lon2=105.2530')
      .expect(200)
      .expect((res) => {
        expect(res.body.distance_km).toBeDefined();
      });
  });

  // 5. Favorites Module
  it('12. POST /api/v1/favorites - Add Destination Bookmark', () => {
    return request(app.getHttpServer())
      .post('/api/v1/favorites')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ canonicalId: 'dest-002' })
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('success');
      });
  });

  it('13. GET /api/v1/favorites - Get User Bookmarks', () => {
    return request(app.getHttpServer())
      .get('/api/v1/favorites')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data.length).toBeGreaterThan(0);
      });
  });

  it('14. DELETE /api/v1/favorites/:canonicalId - Remove Bookmark', () => {
    return request(app.getHttpServer())
      .delete('/api/v1/favorites/dest-001')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('success');
      });
  });

  // 6. Planner Module
  it('15. POST /api/v1/planner/generate - Generate Time-Slotted Multi-Day Itinerary', () => {
    return request(app.getHttpServer())
      .post('/api/v1/planner/generate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Audit Liburan Lampung 3 Hari',
        duration_days: 3,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.data.shareToken).toBeDefined();
        expect(res.body.data.shareUrl).toBeDefined();
      });
  });

  it('16. GET /api/v1/planner/share/:shareToken - Public Shared Itinerary Fetch', () => {
    return request(app.getHttpServer())
      .get('/api/v1/planner/share/share-token-uuid-1234')
      .expect(200)
      .expect((res) => {
        expect(res.body.data.title).toBe('Audit Trip Lampung');
      });
  });

  // 7. Reviews Module
  it('17. POST /api/v1/reviews - Create Review with NLP Inferencing', () => {
    return request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        canonicalId: 'dest-001',
        rating: 5,
        reviewText: 'Pantai luar biasa bersih dan pemandangan sunset memukau!',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.data.sentimentLabel).toBeDefined();
      });
  });

  // 8. Chatbot Module
  it('18. POST /api/v1/chatbot/chat - Raden Gajah AI Concierge Query', () => {
    return request(app.getHttpServer())
      .post('/api/v1/chatbot/chat')
      .send({
        message: 'Rekomendasikan pantai keluarga terbaik di Pesawaran',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.bot_name).toBe('Raden Gajah (AI Concierge Lampung)');
        expect(res.body.data.reply).toBeDefined();
      });
  });
});
