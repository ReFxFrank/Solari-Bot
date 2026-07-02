import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../framework/command';
import { Cooldown, RequireGuild } from '../../lib/permissions';
import { brandedEmbed } from '../../lib/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show a member’s avatar, full size.')
    .addUserOption((o) => o.setName('user').setDescription('Whose avatar (default: you)')),
  preconditions: [RequireGuild, Cooldown(5)],
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const target = interaction.options.getUser('user') ?? interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    // Prefer the per-server avatar when the member has one set.
    const url = (member ?? target).displayAvatarURL({ size: 1024 });

    await interaction.reply({
      embeds: [
        brandedEmbed({ kind: 'info', title: `${member?.displayName ?? target.username}’s avatar` })
          .setImage(url)
          .setDescription(`[Open original](${url})`),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
