import type { ShardingManager } from 'discord.js';
import type { Logger } from '../logger';

/**
 * discordbotlist.com server-count autoposter. Runs in the sharding-manager
 * process so it can sum guild counts across every shard and post the total to
 * the bot's DBL listing. Entirely env-gated on DBL_TOKEN — never started without
 * it. Distinct from top.gg: DBL's endpoint takes a `guilds` count (no
 * server_count/shard_count fields) and authenticates with the raw API token.
 */

const DBL_API = 'https://discordbotlist.com/api/v1';
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
    const guilds = perShard.reduce((sum, n) => sum + (typeof n === 'number' ? n : 0), 0);

    const response = await fetch(`${DBL_API}/bots/${botId}/stats`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ guilds }),
    });
    if (!response.ok) {
      logger.warn({ status: response.status }, 'discordbotlist.com stats post rejected');
      return;
    }
    logger.info({ guilds }, 'Posted server count to discordbotlist.com');
  } catch (err) {
    logger.warn({ err }, 'discordbotlist.com stats post failed');
  }
}

/** Begin periodic server-count posting (after a short settle delay). */
export function startDblAutopost(
  manager: ShardingManager,
  opts: { token: string; botId: string },
  logger: Logger,
): void {
  const run = (): void => void postStats(manager, opts.token, opts.botId, logger);
  setTimeout(run, FIRST_POST_DELAY_MS).unref();
  setInterval(run, POST_INTERVAL_MS).unref();
}
