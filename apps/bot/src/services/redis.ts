import { Redis, type RedisOptions } from 'ioredis';
import { env } from '../env';
import { logger } from '../logger';
import { LogThrottle } from '../lib/logThrottle';

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

const ERROR_LOG_WINDOW_MS = 30_000;

/**
 * ioredis re-emits the same connection error on every reconnect attempt (many
 * per second during an outage). Log the first, then throttle to one line per
 * 30s with a running suppressed count, and note recovery — so a Redis hiccup
 * can't flood the logs.
 */
function attachRedisLogging(client: Redis, label: string): void {
  const throttle = new LogThrottle(ERROR_LOG_WINDOW_MS);
  let erroring = false;

  client.on('error', (err) => {
    erroring = true;
    const suppressed = throttle.record(Date.now());
    if (suppressed !== null) {
      logger.error(
        { err, redis: label, ...(suppressed > 0 ? { suppressed } : {}) },
        `Redis (${label}) error`,
      );
    }
  });

  client.on('ready', () => {
    if (!erroring) return;
    erroring = false;
    const suppressed = throttle.reset();
    logger.info(
      { redis: label, ...(suppressed > 0 ? { suppressed } : {}) },
      `Redis (${label}) reconnected`,
    );
  });
}

attachRedisLogging(redis, 'commands');
attachRedisLogging(subscriber, 'subscriber');

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
