import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { brandedEmbed, errorEmbed } from '../../lib/embeds';
import { RequireBotPermissions, RequireGuild, RequireUserPermissions } from '../../lib/permissions';
import type { Command } from '../../framework/command';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk-delete recent messages in this channel.')
    .addIntegerOption((o) =>
      o
        .setName('amount')
        .setDescription('How many messages to delete (1–100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true),
    )
    .addUserOption((o) => o.setName('user').setDescription('Only delete messages from this user')),
  preconditions: [
    RequireGuild,
    RequireUserPermissions(PermissionFlagsBits.ManageMessages),
    RequireBotPermissions(PermissionFlagsBits.ManageMessages),
  ],
  async execute(interaction) {
    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || channel.isDMBased()) {
      await interaction.reply({
        embeds: [errorEmbed('This command can only be used in a server text channel.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const amount = interaction.options.getInteger('amount', true);
    const user = interaction.options.getUser('user');

    let deletedCount: number;
    if (user) {
      const recent = await channel.messages.fetch({ limit: 100 });
      const targets = recent.filter((message) => message.author.id === user.id).first(amount);
      const deleted = await channel.bulkDelete(targets, true);
      deletedCount = deleted.size;
    } else {
      const deleted = await channel.bulkDelete(amount, true);
      deletedCount = deleted.size;
    }

    await interaction.reply({
      embeds: [
        brandedEmbed({
          kind: 'success',
          description:
            deletedCount === 0
              ? 'No deletable messages found (messages older than 14 days can’t be bulk-deleted).'
              : `Deleted **${deletedCount}** message${deletedCount === 1 ? '' : 's'}${user ? ` from ${user.tag}` : ''}.`,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
