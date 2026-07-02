import type { ShardingManager } from 'discord.js';
import type { Logger } from '../logger';

/**
 * top.gg server-count autoposter. Runs in the sharding-manager process so it can
 * sum guild counts across every shard and post the total to the bot's top.gg
 * listing. Entirely env-gated on TOPGG_TOKEN — never started without it.
 */

const TOPGG_API = 'https://top.gg/api';
const POST_INTERVAL_MS = 30 * 60 * 1000; // every 30 minutes
const FIRST_POST_DELAY_MS = 90 * 1000; // let shards finish READY first

async function postStats(
  manager: ShardingManager,
  token: string,
  botId: string,
  logger: Logger,
): Promise<void> {
  try {
    const perShard = (await manager.fetchClientValues('guilds.cache.size')) as number[];
    const serverCount = perShard.reduce((sum, n) => sum + (typeof n === 'number' ? n : 0), 0);
    const shardCount =
      typeof manager.totalShards === 'number' ? manager.totalShards : perShard.length;

    const response = await fetch(`${TOPGG_API}/bots/${botId}/stats`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ server_count: serverCount, shard_count: shardCount }),
    });
    if (!response.ok) {
      logger.warn({ status: response.status }, 'top.gg stats post rejected');
      return;
    }
    logger.info({ serverCount, shardCount }, 'Posted server count to top.gg');
  } catch (err) {
    logger.warn({ err }, 'top.gg stats post failed');
  }
}

/** Begin periodic server-count posting (after a short settle delay). */
export function startTopggAutopost(
  manager: ShardingManager,
  opts: { token: string; botId: string },
  logger: Logger,
): void {
  const run = (): void => void postStats(manager, opts.token, opts.botId, logger);
  setTimeout(run, FIRST_POST_DELAY_MS).unref();
  setInterval(run, POST_INTERVAL_MS).unref();
}
