/**
 * Startup environment validation.
 *
 * Fails fast on missing or malformed critical config so misconfiguration is
 * caught at boot instead of at the first request. Values are never logged.
 */

type Read = (key: string) => string | undefined;

const isUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isPort = (value: string): boolean => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
};

const isPositiveInt = (value: string, min: number, max: number): boolean => {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max;
};

export interface EnvValidationResult {
  errors: string[];
  warnings: string[];
}

export function validateEnv(read: Read): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = read('NODE_ENV') === 'production';
  const get = (key: string) => read(key)?.trim() || undefined;

  // Required: fail closed
  for (const key of ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if (!get(key)) errors.push(`${key} is required`);
  }

  // Production: additional required keys
  if (isProduction) {
    for (const key of ['REDIS_HOST', 'REDIS_PORT', 'ML_ENGINE_URL', 'ML_SYNC_HMAC_SECRET', 'NINE_ROUTER_URL', 'NINE_ROUTER_API_KEY', 'NINE_ROUTER_MODEL', 'ALLOWED_ORIGINS']) {
      if (!get(key)) errors.push(`${key} is required in production`);
    }
    // Production JWT secrets must be long and distinct from dev defaults
    const accessSecret = get('JWT_ACCESS_SECRET');
    const refreshSecret = get('JWT_REFRESH_SECRET');
    if (accessSecret && accessSecret.length < 32) errors.push('JWT_ACCESS_SECRET must be at least 32 characters in production');
    if (refreshSecret && refreshSecret.length < 32) errors.push('JWT_REFRESH_SECRET must be at least 32 characters in production');
    if (accessSecret && refreshSecret && accessSecret === refreshSecret) errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct in production');
  }

  // Optional with format checks
  const port = get('PORT');
  if (port && !isPort(port)) errors.push('PORT must be an integer between 1 and 65535');

  const redisPort = get('REDIS_PORT');
  if (redisPort && !isPort(redisPort)) errors.push('REDIS_PORT must be an integer between 1 and 65535');

  const timeout = get('NINE_ROUTER_TIMEOUT_MS');
  if (timeout && !isPositiveInt(timeout, 1000, 300000)) {
    errors.push('NINE_ROUTER_TIMEOUT_MS must be an integer between 1000 and 300000');
  }

  for (const key of ['ML_ENGINE_URL', 'NINE_ROUTER_URL', 'OPENAI_BASE_URL']) {
    const value = get(key);
    if (value && !isUrl(value)) errors.push(`${key} must be an http(s) URL`);
  }

  // LLM gateway: warn (not fail) in dev so non-chatbot work still boots; fail in prod
  const hasNineRouter = Boolean(get('NINE_ROUTER_URL') && get('NINE_ROUTER_API_KEY'));
  const hasOpenAiAlias = Boolean(get('OPENAI_BASE_URL') && get('OPENAI_API_KEY'));
  if (!hasNineRouter && !hasOpenAiAlias) {
    if (isProduction) {
      errors.push('LLM gateway (NINE_ROUTER_URL + NINE_ROUTER_API_KEY or OPENAI_* aliases) is required in production');
    } else {
      warnings.push('No LLM gateway configured (NINE_ROUTER_URL + NINE_ROUTER_API_KEY or OPENAI_* aliases); chatbot will return 503');
    }
  }

  // Production: no localhost/127.0.0.1 in ALLOWED_ORIGINS
  if (isProduction) {
    const allowed = get('ALLOWED_ORIGINS');
    if (allowed) {
      const origins = allowed.split(',').map((o) => o.trim());
      for (const origin of origins) {
        if (/^(http:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
          errors.push('ALLOWED_ORIGINS must not contain localhost or 127.0.0.1 in production');
          break;
        }
      }
    }
  }

  return { errors, warnings };
}

/** Throws with a readable summary when critical config is invalid. */
export function assertValidEnv(read: Read, log: { warn(msg: string): void; error(msg: string): void }): void {
  const { errors, warnings } = validateEnv(read);
  warnings.forEach((w) => log.warn(w));
  if (errors.length > 0) {
    const message = `Invalid environment configuration:\n  - ${errors.join('\n  - ')}`;
    log.error(message);
    throw new Error(message);
  }
}
