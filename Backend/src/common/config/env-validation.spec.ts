import { validateEnv } from './env-validation';

describe('validateEnv', () => {
  const validBase = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    ML_ENGINE_URL: 'http://localhost:8000',
    ML_SYNC_HMAC_SECRET: 'test-ml-sync-hmac-secret-min-32-chars-long',
    NINE_ROUTER_URL: 'http://localhost:20128/v1',
    NINE_ROUTER_API_KEY: 'test-key',
    NINE_ROUTER_MODEL: 'test-model',
    ALLOWED_ORIGINS: 'http://localhost:5173',
  };

  it('accepts a valid development configuration', () => {
    const result = validateEnv((key) => validBase[key as keyof typeof validBase]);
    expect(result.errors).toEqual([]);
  });

  it('requires production dependencies and secure origin configuration', () => {
    const result = validateEnv((key) => ({ ...validBase, NODE_ENV: 'production', ALLOWED_ORIGINS: 'http://localhost:5173', NINE_ROUTER_API_KEY: undefined }[key]));
    expect(result.errors).toEqual(expect.arrayContaining([
      'NINE_ROUTER_API_KEY is required in production',
      'ALLOWED_ORIGINS must not contain localhost or 127.0.0.1 in production',
    ]));
  });

  it('rejects short or reused production JWT secrets', () => {
    const result = validateEnv((key) => ({
      ...validBase,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'short',
      JWT_REFRESH_SECRET: 'short',
      ALLOWED_ORIGINS: 'https://kelanalampung.id',
    }[key]));
    expect(result.errors).toEqual(expect.arrayContaining([
      'JWT_ACCESS_SECRET must be at least 32 characters in production',
      'JWT_REFRESH_SECRET must be at least 32 characters in production',
      'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct in production',
    ]));
  });
});
