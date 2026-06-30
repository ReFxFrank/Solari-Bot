import './load-env';
import { REST, Routes } from 'discord.js';
import { env } from './env';
import { logger } from './logger';
import { loadCommands } from './framework/loaders';

/**
 * Register slash commands (§5.1, §12). With DEV_GUILD_ID set, registers
 * guild-scoped commands (instant updates) for fast dev iteration; otherwise
 * registers globally (propagation can take up to an hour).
 */
async function main(): Promise<void> {
  const commands = await loadCommands();
  const body = [...commands.values()].map((command) => command.data.toJSON());

  const rest = new REST().setToken(env.DISCORD_TOKEN);

  if (env.DEV_GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DEV_GUILD_ID), {
      body,
    });
    logger.info({ count: body.length, guild: env.DEV_GUILD_ID }, 'Registered guild commands (dev)');
  } else {
    await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body });
    logger.info({ count: body.length }, 'Registered global commands');
  }
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Failed to deploy commands');
  process.exit(1);
});
