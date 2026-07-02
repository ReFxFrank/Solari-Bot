import { SHARD_STATUS_PREFIX, type ShardStatus } from '@solari/shared';
import { getRedis } from './redis';

/**
 * Read every shard's TTL'd heartbeat key (written by the bot every ~30s).
 * Returns [] when no shard is reporting (bot down) and null when Redis itself
 * is unreachable — the /status page renders the two differently.
 */
export async function fetchShardStatuses(): Promise<ShardStatus[] | null> {
  const read = async (): Promise<ShardStatus[]> => {
    const redis = getRedis();
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await redis.scan(
        cursor,
        'MATCH',
        `${SHARD_STATUS_PREFIX}*`,
        'COUNT',
        500,
      );
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');
    if (keys.length === 0) return [];

    const values = await redis.mget(...keys);
    const parsed: ShardStatus[] = [];
    for (const value of values) {
      if (!value) continue;
      try {
        parsed.push(JSON.parse(value) as ShardStatus);
      } catch {
        // Skip a malformed entry rather than blank the whole section.
      }
    }
    return parsed.sort((a, b) => a.shardId - b.shardId);
  };

  // The shared Redis client retries forever (maxRetriesPerRequest: null), so a
  // dead Redis would hang the page render without an explicit deadline.
  try {
    return await Promise.race([
      read(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
  } catch {
    return null;
  }
}

/** "3d 4h" / "2h 05m" / "45s" — coarse on purpose, it's a status page. */
export function formatUptime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}
