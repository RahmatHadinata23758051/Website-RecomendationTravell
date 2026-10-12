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
  const get = (key: string) => read(key)?.trim() || undefined;

  // Required: fail closed
  for (const key of ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if (!get(key)) errors.push(`${key} is required`);
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

  // LLM gateway: warn (not fail) so non-chatbot work still boots
  const hasNineRouter = Boolean(get('NINE_ROUTER_URL') && get('NINE_ROUTER_API_KEY'));
  const hasOpenAiAlias = Boolean(get('OPENAI_BASE_URL') && get('OPENAI_API_KEY'));
  if (!hasNineRouter && !hasOpenAiAlias) {
    warnings.push('No LLM gateway configured (NINE_ROUTER_URL + NINE_ROUTER_API_KEY or OPENAI_* aliases); chatbot will return 503');
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
