import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { prisma } from '@solari/database';
import type { Command } from '../../framework/command';
import { RequireGuild, RequirePremium } from '../../lib/permissions';
import { brandedEmbed } from '../../lib/embeds';
import { cooldownRemaining, formatDuration, formatMoney, getEconomyUser } from '../../lib/economy';

const DAY_SECONDS = 86_400;

const command: Command = {
  data: new SlashCommandBuilder().setName('daily').setDescription('Claim your daily reward.'),
  module: 'ECONOMY',
  preconditions: [RequireGuild, RequirePremium('ECONOMY')],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;
    const config = await ctx.config.getConfig(interaction.guildId, 'ECONOMY');
    const eco = await getEconomyUser(interaction.guildId, interaction.user.id, config.startingBalance);

    const remaining = cooldownRemaining(eco.lastDaily, DAY_SECONDS);
    if (remaining > 0) {
      await interaction.reply({
        embeds: [
          brandedEmbed({
            kind: 'warning',
            description: `You've already claimed today. Come back in **${formatDuration(remaining)}**.`,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await prisma.economyUser.update({
      where: { guildId_userId: { guildId: interaction.guildId, userId: interaction.user.id } },
      data: { wallet: { increment: config.dailyAmount }, lastDaily: new Date() },
    });

    await interaction.reply({
      embeds: [
        brandedEmbed({
          kind: 'success',
          description: `🎁 You claimed your daily ${formatMoney(config.dailyAmount, config)}!`,
        }),
      ],
    });
  },
};

export default command;
