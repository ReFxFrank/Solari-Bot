import { ChannelType, MessageFlags, SlashCommandBuilder, time, TimestampStyles } from 'discord.js';
import type { Command } from '../../framework/command';
import { Cooldown, RequireGuild } from '../../lib/permissions';
import { brandedEmbed } from '../../lib/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Details about this server — members, channels, boosts.'),
  preconditions: [RequireGuild, Cooldown(5)],
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const { guild } = interaction;

    const channels = guild.channels.cache;
    const text = channels.filter((c) => c.type === ChannelType.GuildText).size;
    const voice = channels.filter((c) => c.type === ChannelType.GuildVoice).size;
    const categories = channels.filter((c) => c.type === ChannelType.GuildCategory).size;

    const embed = brandedEmbed({ kind: 'info', title: guild.name })
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
        {
          name: 'Created',
          value: time(guild.createdAt, TimestampStyles.RelativeTime),
          inline: true,
        },
        { name: 'Members', value: guild.memberCount.toLocaleString(), inline: true },
        {
          name: 'Channels',
          value: `${text} text · ${voice} voice · ${categories} categories`,
          inline: true,
        },
        { name: 'Roles', value: String(guild.roles.cache.size - 1), inline: true },
        {
          name: 'Boosts',
          value: `${guild.premiumSubscriptionCount ?? 0} (Tier ${guild.premiumTier})`,
          inline: true,
        },
      )
      .setFooter({ text: `Server ID: ${guild.id}` });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
