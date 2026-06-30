import { MessageFlags, type ChatInputCommandInteraction, type Interaction } from 'discord.js';
import { brandedEmbed, errorEmbed } from '../lib/embeds';
import { commandCounter, commandLatency } from '../services/metrics';
import type { BotContext } from './context';
import type { Command } from './command';

async function respond(
  interaction: ChatInputCommandInteraction,
  embed: ReturnType<typeof errorEmbed>,
): Promise<void> {
  const payload = { embeds: [embed], flags: MessageFlags.Ephemeral } as const;
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch {
    // Interaction expired or already acknowledged elsewhere — nothing to do.
  }
}

/** Route an incoming interaction to its command / autocomplete handler (§5.1). */
export async function dispatchInteraction(
  interaction: Interaction,
  ctx: BotContext,
  commands: Map<string, Command>,
): Promise<void> {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;

    // Module gate (commands may require a module to be enabled).
    if (command.module && interaction.inGuild()) {
      const enabled = await ctx.config.isEnabled(interaction.guildId, command.module);
      if (!enabled) {
        await respond(
          interaction,
          brandedEmbed({ kind: 'warning', description: 'That module is disabled on this server.' }),
        );
        return;
      }
    }

    // Preconditions.
    for (const precondition of command.preconditions ?? []) {
      const result = await precondition(interaction, ctx);
      if (!result.ok) {
        commandCounter.inc({ command: interaction.commandName, status: 'denied' });
        await respond(
          interaction,
          brandedEmbed({
            kind: 'warning',
            description: result.message ?? 'You cannot use this command.',
          }),
        );
        return;
      }
    }

    const stopTimer = commandLatency.startTimer({ command: interaction.commandName });
    try {
      await command.execute(interaction, ctx);
      commandCounter.inc({ command: interaction.commandName, status: 'ok' });
    } catch (err) {
      ctx.logger.error({ err, command: interaction.commandName }, 'Command execution failed');
      commandCounter.inc({ command: interaction.commandName, status: 'error' });
      await respond(
        interaction,
        errorEmbed('An unexpected error occurred while running that command.'),
      );
    } finally {
      stopTimer();
    }
    return;
  }

  if (interaction.isAutocomplete()) {
    const command = commands.get(interaction.commandName);
    if (!command?.autocomplete) return;
    try {
      await command.autocomplete(interaction, ctx);
    } catch (err) {
      ctx.logger.error({ err, command: interaction.commandName }, 'Autocomplete failed');
    }
  }
}
