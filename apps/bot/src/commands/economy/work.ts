import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { prisma } from '@solari/database';
import type { Command } from '../../framework/command';
import { RequireGuild, RequirePremium } from '../../lib/permissions';
import { brandedEmbed } from '../../lib/embeds';
import { cooldownRemaining, formatDuration, formatMoney, getEconomyUser } from '../../lib/economy';

const FLAVOURS = [
  'You delivered pizzas',
  'You walked some dogs',
  'You fixed a bug in production',
  'You streamed for a few hours',
  'You mowed the lawn',
  'You wrote some code',
  'You sold lemonade',
];

const command: Command = {
  data: new SlashCommandBuilder().setName('work').setDescription('Work for some quick cash.'),
  module: 'ECONOMY',
  preconditions: [RequireGuild, RequirePremium('ECONOMY')],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;
    const config = await ctx.config.getConfig(interaction.guildId, 'ECONOMY');
    const eco = await getEconomyUser(interaction.guildId, interaction.user.id, config.startingBalance);

    const remaining = cooldownRemaining(eco.lastWork, config.workCooldownSeconds);
    if (remaining > 0) {
      await interaction.reply({
        embeds: [
          brandedEmbed({
            kind: 'warning',
            description: `You're worn out. Try again in **${formatDuration(remaining)}**.`,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const min = config.workMin;
    const max = Math.max(config.workMin, config.workMax);
    const earned = min + Math.floor(Math.random() * (max - min + 1));
    const flavour = FLAVOURS[Math.floor(Math.random() * FLAVOURS.length)] ?? 'You worked hard';

    await prisma.economyUser.update({
      where: { guildId_userId: { guildId: interaction.guildId, userId: interaction.user.id } },
      data: { wallet: { increment: earned }, lastWork: new Date() },
    });

    await interaction.reply({
      embeds: [
        brandedEmbed({
          kind: 'success',
          description: `🛠️ ${flavour} and earned ${formatMoney(earned, config)}.`,
        }),
      ],
    });
  },
};

export default command;
