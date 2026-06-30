import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { prisma } from '@helios/database';
import { xpProgress } from '@helios/shared';
import { brandedEmbed } from '../../lib/embeds';
import { RequireGuild } from '../../lib/permissions';
import type { Command } from '../../framework/command';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your level and XP.')
    .addUserOption((o) => o.setName('user').setDescription('Whose rank to show')),
  module: 'LEVELING',
  preconditions: [RequireGuild],
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const target = interaction.options.getUser('user') ?? interaction.user;

    const userLevel = await prisma.userLevel.findUnique({
      where: { guildId_userId: { guildId: interaction.guildId, userId: target.id } },
    });
    if (!userLevel) {
      await interaction.reply({
        embeds: [
          brandedEmbed({
            kind: 'info',
            description: `${target.username} hasn’t earned any XP yet.`,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const rank =
      (await prisma.userLevel.count({
        where: { guildId: interaction.guildId, xp: { gt: userLevel.xp } },
      })) + 1;
    const { level, current, needed } = xpProgress(userLevel.xp);

    await interaction.reply({
      embeds: [
        brandedEmbed({
          kind: 'info',
          title: `${target.username} — Level ${level}`,
          description: [
            `**Rank:** #${rank}`,
            `**Progress:** ${current} / ${needed} XP`,
            `**Total XP:** ${userLevel.xp}`,
            `**Messages:** ${userLevel.messages}`,
          ].join('\n'),
        }),
      ],
    });
  },
};

export default command;
