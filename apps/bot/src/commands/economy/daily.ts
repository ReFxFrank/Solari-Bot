import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../framework/command';
import { RequireGuild, RequirePremium } from '../../lib/permissions';
import { brandedEmbed } from '../../lib/embeds';
import { cooldownRemaining, formatDuration, formatMoney, getEconomyUser, tryClaimDaily } from '../../lib/economy';
import { evaluateAchievements } from '../../modules/achievements';

const DAY_SECONDS = 86_400;

const command: Command = {
  data: new SlashCommandBuilder().setName('daily').setDescription('Claim your daily reward.'),
  module: 'ECONOMY',
  preconditions: [RequireGuild, RequirePremium('ECONOMY')],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;
    const config = await ctx.config.getConfig(interaction.guildId, 'ECONOMY');
    // Ensure the row exists so the atomic claim can match it.
    await getEconomyUser(interaction.guildId, interaction.user.id, config.startingBalance);

    // Cooldown check + grant in one guarded write — concurrent /daily can't double-claim.
    if (!(await tryClaimDaily(interaction.guildId, interaction.user.id, config.dailyAmount, DAY_SECONDS))) {
      const eco = await getEconomyUser(interaction.guildId, interaction.user.id, config.startingBalance);
      await interaction.reply({
        embeds: [
          brandedEmbed({
            kind: 'warning',
            description: `You've already claimed today. Come back in **${formatDuration(cooldownRemaining(eco.lastDaily, DAY_SECONDS))}**.`,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      embeds: [
        brandedEmbed({
          kind: 'success',
          description: `🎁 You claimed your daily ${formatMoney(config.dailyAmount, config)}!`,
        }),
      ],
    });
    await evaluateAchievements(interaction.guildId, interaction.user.id, {
      client: ctx.client,
      logger: ctx.logger,
    });
  },
};

export default command;
