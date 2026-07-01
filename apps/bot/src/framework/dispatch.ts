import { MessageFlags, type ChatInputCommandInteraction, type Interaction } from 'discord.js';
import { brandedEmbed, errorEmbed } from '../lib/embeds';
import { isBotOwner } from '../lib/permissions';
import { commandCounter, commandLatency } from '../services/metrics';
import { isBlacklisted } from '../services/blacklist';
import type { BotContext } from './context';
import type { Command } from './command';
import type { ComponentHandler } from './component';
import { parseCustomId } from './customId';

async function respond(
  interaction: ChatInputCommandInteraction,
  embed: ReturnType<typeof errorEmbed>,
): Promise<void> {
  try {
    if (interaction.deferred && !interaction.replied) {
      // Fill the deferred placeholder (ephemerality was fixed at defer time).
      await interaction.editReply({ embeds: [embed] });
    } else if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
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
  componentHandlers: Map<string, ComponentHandler>,
): Promise<void> {
  if (interaction.isMessageComponent()) {
    const parsed = parseCustomId(interaction.customId);
    const handler = componentHandlers.get(parsed.module);
    if (!handler) return;
    try {
      await handler(interaction, parsed, ctx);
    } catch (err) {
      ctx.logger.error({ err, customId: interaction.customId }, 'Component handler failed');
    }
    return;
  }

  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;

    // Blacklist gate: a barred guild or user can't run anything (owners exempt).
    if (!isBotOwner(interaction.user.id)) {
      const guildId = interaction.inGuild() ? interaction.guildId : null;
      if (await isBlacklisted(guildId, interaction.user.id)) {
        await respond(
          interaction,
          brandedEmbed({
            kind: 'danger',
            description: 'You or this server are blocked from using this bot.',
          }),
        );
        return;
      }
    }

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
