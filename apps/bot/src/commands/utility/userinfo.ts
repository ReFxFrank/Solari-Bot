import { MessageFlags, SlashCommandBuilder, time, TimestampStyles } from 'discord.js';
import type { Command } from '../../framework/command';
import { Cooldown, RequireGuild } from '../../lib/permissions';
import { brandedEmbed } from '../../lib/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Details about a member — account age, join date, roles.')
    .addUserOption((o) => o.setName('user').setDescription('Who to look up (default: you)')),
  preconditions: [RequireGuild, Cooldown(5)],
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const target = interaction.options.getUser('user') ?? interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    const roles = member
      ? [...member.roles.cache.filter((role) => role.id !== interaction.guildId).values()]
          .sort((a, b) => b.position - a.position)
          .slice(0, 10)
      : [];

    const embed = brandedEmbed({
      kind: 'info',
      title: member?.displayName ?? target.username,
    })
      .setThumbnail((member ?? target).displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'User', value: `${target} (\`${target.id}\`)`, inline: false },
        {
          name: 'Account created',
          value: time(target.createdAt, TimestampStyles.RelativeTime),
          inline: true,
        },
        ...(member?.joinedAt
          ? [
              {
                name: 'Joined server',
                value: time(member.joinedAt, TimestampStyles.RelativeTime),
                inline: true,
              },
            ]
          : []),
        ...(member?.premiumSince
          ? [
              {
                name: 'Boosting since',
                value: time(member.premiumSince, TimestampStyles.RelativeTime),
                inline: true,
              },
            ]
          : []),
        ...(roles.length > 0
          ? [
              {
                name: `Roles (${member?.roles.cache.size ? member.roles.cache.size - 1 : 0})`,
                value: roles.map((role) => role.toString()).join(' '),
                inline: false,
              },
            ]
          : []),
      );
    if (target.bot) embed.setFooter({ text: 'Bot account' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
