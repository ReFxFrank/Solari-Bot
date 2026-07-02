import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { errorEmbed, successEmbed } from '../../lib/embeds';
import { RequireGuild, RequireUserPermissions } from '../../lib/permissions';
import { buildApplyPanelMessage, getEnabledForms } from '../../modules/applications';
import type { Command } from '../../framework/command';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('applications')
    .setDescription('Manage application forms.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('panel')
        .setDescription('Post the application panel (buttons that open each form).')
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Channel to post in (defaults to here)')
            .addChannelTypes(ChannelType.GuildText),
        ),
    ),
  module: 'APPLICATIONS',
  preconditions: [RequireGuild, RequireUserPermissions(PermissionFlagsBits.ManageGuild)],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;
    void ctx;
    // Only subcommand for now.
    const forms = await getEnabledForms(interaction.guildId);
    if (forms.length === 0) {
      await interaction.reply({
        embeds: [
          errorEmbed('There are no enabled forms yet. Create one in the dashboard first.'),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const target = interaction.options.getChannel('channel') ?? interaction.channel;
    if (!target || target.type !== ChannelType.GuildText) {
      await interaction.reply({
        embeds: [errorEmbed('Pick a text channel to post the panel in.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sent = await target.send(buildApplyPanelMessage(forms)).catch(() => null);
    await interaction.editReply(
      sent
        ? { embeds: [successEmbed(`Application panel posted in <#${target.id}>.`)] }
        : { embeds: [errorEmbed('I couldn’t post there — check my permissions in that channel.')] },
    );
  },
};

export default command;
