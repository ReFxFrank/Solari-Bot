import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { errorEmbed, successEmbed } from '../../lib/embeds';
import { RequireGuild, RequireUserPermissions } from '../../lib/permissions';
import { buildVerificationPanel } from '../../modules/verification';
import type { Command } from '../../framework/command';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('verification')
    .setDescription('Manage the member verification gate.')
    .addSubcommand((s) =>
      s
        .setName('panel')
        .setDescription('Post the verification button panel.')
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Channel to post the panel in (defaults to here).')
            .addChannelTypes(ChannelType.GuildText),
        ),
    ),
  module: 'VERIFICATION',
  preconditions: [RequireGuild, RequireUserPermissions(PermissionFlagsBits.ManageGuild)],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;

    const verification = await ctx.config.getConfig(interaction.guildId, 'VERIFICATION');
    if (!verification.verifiedRoleId) {
      await interaction.reply({
        embeds: [errorEmbed('Pick a verified role on the dashboard first.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const target = interaction.options.getChannel('channel') ?? interaction.channel;
    if (!target || target.type !== ChannelType.GuildText) {
      await interaction.reply({
        embeds: [errorEmbed('Pick a text channel for the panel.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await target.send(buildVerificationPanel(verification)).catch(() => null);
    await interaction.reply({
      embeds: [successEmbed(`Verification panel deployed to ${target}.`)],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
