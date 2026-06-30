import { Redis, type RedisOptions } from 'ioredis';
import { env } from '../env';
import { logger } from '../logger';

/**
 * Redis connections, separated by role:
 *  - `redis`: general commands (publish, get/set, ...).
 *  - `subscriber`: a dedicated connection in subscribe mode (ioredis forbids
 *    normal commands on a connection that has entered subscribe mode).
 *  - `bullConnection`: RedisOptions handed to BullMQ, which creates and manages
 *    its own connections per Queue/Worker (the recommended pattern). BullMQ
 *    requires `maxRetriesPerRequest: null`.
 */
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const subscriber = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

redis.on('error', (err) => logger.error({ err }, 'Redis (commands) error'));
subscriber.on('error', (err) => logger.error({ err }, 'Redis (subscriber) error'));

function redisOptionsFromUrl(url: string): RedisOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : 0,
    maxRetriesPerRequest: null,
  };
}

export const bullConnection: RedisOptions = redisOptionsFromUrl(env.REDIS_URL);

export async function closeRedis(): Promise<void> {
  await Promise.allSettled([redis.quit(), subscriber.quit()]);
}
