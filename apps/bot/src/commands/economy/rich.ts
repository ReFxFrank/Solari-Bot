import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { prisma } from '@solari/database';
import type { Command } from '../../framework/command';
import { RequireGuild, RequirePremium } from '../../lib/permissions';
import { brandedEmbed } from '../../lib/embeds';
import { formatMoney } from '../../lib/economy';

const command: Command = {
  data: new SlashCommandBuilder().setName('rich').setDescription('Richest members in the server.'),
  module: 'ECONOMY',
  preconditions: [RequireGuild, RequirePremium('ECONOMY')],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;
    const config = await ctx.config.getConfig(interaction.guildId, 'ECONOMY');

    // Pull the top wallets, then rank by total (wallet + bank) — an index on the
    // sum isn't possible, and high earners almost always lead on wallet too.
    const rows = (await prisma.economyUser.findMany({
      where: { guildId: interaction.guildId },
      orderBy: { wallet: 'desc' },
      take: 25,
    })) as { userId: string; wallet: number; bank: number }[];
    const top = rows
      .map((r) => ({ userId: r.userId, total: r.wallet + r.bank }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    if (top.length === 0) {
      await interaction.reply({
        embeds: [brandedEmbed({ kind: 'info', description: 'No one has any money yet.' })],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = top.map(
      (e, i) => `${medals[i] ?? `**${i + 1}.**`} <@${e.userId}> — ${formatMoney(e.total, config)}`,
    );

    await interaction.reply({
      embeds: [
        brandedEmbed({ kind: 'default', title: `🏆 ${interaction.guild.name} — Richest`, description: lines.join('\n') }),
      ],
    });
  },
};

export default command;
