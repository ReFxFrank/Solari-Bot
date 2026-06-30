import './load-env';
import { fileURLToPath } from 'node:url';
import { ShardingManager } from 'discord.js';
import { env } from './env';
import { logger } from './logger';

/**
 * ShardingManager entry (§4.5). Spawns the per-shard client in `client.ts`.
 *
 * The shard children are forked with `--import tsx` so they can run the
 * TypeScript entry directly (matching how the parent is launched), without a
 * separate build step.
 */
async function main(): Promise<void> {
  const shardFile = fileURLToPath(new URL('./client.ts', import.meta.url));

  const manager = new ShardingManager(shardFile, {
    token: env.DISCORD_TOKEN,
    totalShards: 'auto',
    execArgv: ['--import', 'tsx'],
    respawn: true,
  });

  manager.on('shardCreate', (shard) => {
    logger.info({ shard: shard.id }, 'Launching shard');
    shard.on('death', () => logger.error({ shard: shard.id }, 'Shard process died'));
  });

  await manager.spawn();
  logger.info({ shards: manager.totalShards }, 'All shards spawned');
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Fatal error in sharding manager');
  process.exit(1);
});
