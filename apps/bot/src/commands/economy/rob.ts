import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../framework/command';
import { RequireGuild, RequirePremium } from '../../lib/permissions';
import { brandedEmbed, errorEmbed } from '../../lib/embeds';
import {
  cooldownRemaining,
  formatDuration,
  formatMoney,
  getEconomyUser,
  tryStampRob,
  tryTransferWallet,
} from '../../lib/economy';

const MIN_VICTIM_WALLET = 100;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Attempt to rob another member — risky!')
    .addUserOption((o) => o.setName('user').setDescription('Who to rob').setRequired(true)),
  module: 'ECONOMY',
  preconditions: [RequireGuild, RequirePremium('ECONOMY')],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;
    const config = await ctx.config.getConfig(interaction.guildId, 'ECONOMY');
    if (!config.robEnabled) {
      await interaction.reply({
        embeds: [errorEmbed('Robbing is disabled on this server.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const target = interaction.options.getUser('user', true);
    if (target.id === interaction.user.id || target.bot) {
      await interaction.reply({
        embeds: [errorEmbed('Pick a different member to rob.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const actor = await getEconomyUser(
      interaction.guildId,
      interaction.user.id,
      config.startingBalance,
    );
    const victim = await getEconomyUser(interaction.guildId, target.id, config.startingBalance);

    if (victim.wallet < MIN_VICTIM_WALLET) {
      await interaction.reply({
        embeds: [errorEmbed(`<@${target.id}> doesn't have enough in their wallet to rob.`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Cooldown gate — stamped only when the attempt actually proceeds.
    if (config.robCooldownSeconds > 0) {
      const proceeded = await tryStampRob(
        interaction.guildId,
        interaction.user.id,
        config.robCooldownSeconds,
      );
      if (!proceeded) {
        const remaining = cooldownRemaining(actor.lastRob, config.robCooldownSeconds);
        await interaction.reply({
          embeds: [
            brandedEmbed({
              kind: 'warning',
              description: `You're lying low. Try robbing again in **${formatDuration(remaining)}**.`,
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    if (Math.random() * 100 < config.robSuccessRate) {
      // Success: steal 10–40% of the victim's wallet, transferred atomically.
      const stolen = Math.max(1, Math.floor(victim.wallet * (0.1 + Math.random() * 0.3)));
      if (!(await tryTransferWallet(interaction.guildId, target.id, interaction.user.id, stolen))) {
        await interaction.reply({
          embeds: [
            brandedEmbed({
              kind: 'warning',
              description: `<@${target.id}> moved their money just in time — you got nothing.`,
            }),
          ],
        });
        return;
      }
      await interaction.reply({
        embeds: [
          brandedEmbed({
            kind: 'success',
            description: `🦝 You robbed <@${target.id}> and got away with ${formatMoney(stolen, config)}!`,
          }),
        ],
      });
      return;
    }

    // Caught: pay the victim a fine — a percent of the robber's own wallet.
    const penalty = Math.min(
      actor.wallet,
      Math.floor((actor.wallet * config.robFinePercent) / 100),
    );
    if (
      penalty > 0 &&
      (await tryTransferWallet(interaction.guildId, interaction.user.id, target.id, penalty))
    ) {
      await interaction.reply({
        embeds: [
          brandedEmbed({
            kind: 'danger',
            description: `🚨 You got caught and paid <@${target.id}> ${formatMoney(penalty, config)} in damages.`,
          }),
        ],
      });
      return;
    }
    await interaction.reply({
      embeds: [
        brandedEmbed({
          kind: 'danger',
          description: '🚨 You got caught — lucky for you, your wallet was empty.',
        }),
      ],
    });
  },
};

export default command;
