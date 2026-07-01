import { getRedis } from './redis';

/**
 * Fixed-window mutation rate limit, keyed per user. Every dashboard mutation
 * funnels through assertCanManage/requireOwner, so this single limiter shields
 * Postgres/Redis/Discord from a scripted client hammering server actions —
 * while staying far above any human clicking Save.
 *
 * Fails OPEN on Redis errors: for already-authenticated users, availability
 * beats strictness (the DB writes behind these actions are idempotent upserts).
 */

const WINDOW_SECONDS = 60;
const DEFAULT_LIMIT = 60;

export class RateLimitError extends Error {
  constructor() {
    super('Too many changes at once — wait a minute and try again.');
    this.name = 'RateLimitError';
  }
}

/** Mutations allowed per user per minute. 0 disables the limiter. */
function maxPerWindow(): number {
  const raw = Number(process.env.RATE_LIMIT_MUTATIONS_PER_MINUTE ?? DEFAULT_LIMIT);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : DEFAULT_LIMIT;
}

export async function enforceMutationRateLimit(userId: string): Promise<void> {
  const max = maxPerWindow();
  if (max === 0) return;

  // Bucketed key: INCR + one EXPIRE per window, no NX gymnastics.
  const bucket = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const key = `ratelimit:mutation:${userId}:${bucket}`;
  let count: number;
  try {
    const redis = getRedis();
    count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS + 5);
  } catch {
    return; // Redis unavailable — fail open
  }
  if (count > max) throw new RateLimitError();
}
