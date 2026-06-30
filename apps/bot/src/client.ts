import './load-env';
import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  type ClientEvents,
} from 'discord.js';
import { prisma } from '@helios/database';
import { env } from './env';
import { logger } from './logger';
import { ConfigCache } from './services/configCache';
import { JobService } from './services/jobs';
import { closeRedis, redis } from './services/redis';
import { guildGauge, startMetricsServer } from './services/metrics';
import { loadCommands, loadComponentHandlers, loadEvents } from './framework/loaders';
import { dispatchInteraction } from './framework/dispatch';
import { LiveCommandService } from './services/liveCommands';
import { QUEUE_NAMES } from '@helios/jobs';
import { handleTempActionExpire } from './jobs/handlers/tempActionExpire';
import { handleGiveawayEnd } from './jobs/handlers/giveawayEnd';
import type { BotContext } from './framework/context';

/**
 * Per-shard client bootstrap. Spawned by the ShardingManager in `index.ts`.
 *
 * Privileged intents (GuildMembers, MessageContent) must be enabled in the
 * Discord Developer Portal — member events and content-scanning automod need
 * them (§1.6).
 */
async function bootstrap(): Promise<void> {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.MessageContent,
    ],
    partials: [
      Partials.GuildMember,
      Partials.User,
      Partials.Message,
      Partials.Reaction,
      Partials.Channel,
    ],
  });

  const config = new ConfigCache();
  const jobs = new JobService(client, logger);
  const ctx: BotContext = { client, logger, prisma, config, jobs, redis };

  const [commands, events, componentHandlers] = await Promise.all([
    loadCommands(),
    loadEvents(),
    loadComponentHandlers(),
  ]);
  logger.info(
    { commands: commands.size, events: events.length, components: componentHandlers.size },
    'Loaded commands, events, and component handlers',
  );

  jobs.registerHandler(QUEUE_NAMES.tempActionExpire, handleTempActionExpire);
  jobs.registerHandler(QUEUE_NAMES.giveawayEnd, handleGiveawayEnd);

  const liveCommands = new LiveCommandService(client, logger);

  for (const event of events) {
    const run = (...args: ClientEvents[typeof event.name]): void => {
      void Promise.resolve(event.execute(ctx, ...args)).catch((err: unknown) =>
        logger.error({ err, event: event.name }, 'Event handler error'),
      );
    };
    if (event.once) client.once(event.name, run);
    else client.on(event.name, run);
  }

  client.on(Events.InteractionCreate, (interaction) => {
    void dispatchInteraction(interaction, ctx, commands, componentHandlers).catch((err: unknown) =>
      logger.error({ err }, 'Interaction dispatch error'),
    );
  });

  await config.start();
  await liveCommands.start();

  let stopMetrics: (() => Promise<void>) | null = null;

  client.once(Events.ClientReady, (ready) => {
    logger.info(
      { user: ready.user.tag, guilds: ready.guilds.cache.size, shards: ready.shard?.ids ?? [0] },
      'Shard ready',
    );
    ready.user.setActivity({ name: '/help', type: ActivityType.Listening });
    guildGauge.set(ready.guilds.cache.size);
    // Workers use the authed REST client, so start them once logged in.
    jobs.startWorkers();
    // Re-arm any temp-action timers from the DB for guilds this shard owns.
    void jobs
      .reconcile()
      .catch((err: unknown) => logger.error({ err }, 'Temp-action reconcile failed'));
    stopMetrics = startMetricsServer(ready.shard?.ids[0] ?? 0);
  });

  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down shard');
    try {
      await jobs.close();
      if (stopMetrics) await stopMetrics();
      await closeRedis();
      await prisma.$disconnect();
      await client.destroy();
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
    }
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await client.login(env.DISCORD_TOKEN);
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, 'Fatal error during client bootstrap');
  process.exit(1);
});
