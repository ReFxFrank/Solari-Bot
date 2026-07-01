import { afterAll, describe, expect, it } from 'vitest';
import { Redis } from 'ioredis';
import { RateLimitError, enforceMutationRateLimit } from './rate-limit';
import { getRedis } from './redis';

/** True when a Redis is reachable at REDIS_URL (CI service container). */
async function redisUp(): Promise<boolean> {
  const probe = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    lazyConnect: true,
    connectTimeout: 1500,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,
  });
  try {
    await probe.connect();
    const pong = await probe.ping();
    return pong === 'PONG';
  } catch {
    return false;
  } finally {
    probe.disconnect();
  }
}

let usedSingleton = false;

afterAll(() => {
  // Only tear down the module singleton if a test actually created it.
  if (usedSingleton) getRedis().disconnect();
});

describe('enforceMutationRateLimit (integration)', () => {
  it('allows up to the limit, then throws RateLimitError', async (ctx) => {
    if (!(await redisUp())) return ctx.skip();
    usedSingleton = true;

    process.env.RATE_LIMIT_MUTATIONS_PER_MINUTE = '5';
    const userId = `test-${process.pid}-${Math.random().toString(36).slice(2)}`;
    for (let i = 0; i < 5; i++) {
      await expect(enforceMutationRateLimit(userId)).resolves.toBeUndefined();
    }
    await expect(enforceMutationRateLimit(userId)).rejects.toBeInstanceOf(RateLimitError);
    delete process.env.RATE_LIMIT_MUTATIONS_PER_MINUTE;
  });

  it('is disabled when the limit is 0', async (ctx) => {
    if (!(await redisUp())) return ctx.skip();
    usedSingleton = true;

    process.env.RATE_LIMIT_MUTATIONS_PER_MINUTE = '0';
    const userId = `test-off-${process.pid}`;
    for (let i = 0; i < 20; i++) {
      await expect(enforceMutationRateLimit(userId)).resolves.toBeUndefined();
    }
    delete process.env.RATE_LIMIT_MUTATIONS_PER_MINUTE;
  });
});
