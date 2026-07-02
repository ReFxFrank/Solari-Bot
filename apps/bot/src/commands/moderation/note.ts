import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../framework/command';
import { RequireGuild, RequireUserPermissions } from '../../lib/permissions';
import { brandedEmbed } from '../../lib/embeds';
import { createModerationCase } from '../../lib/cases';
import { postModLog } from '../../lib/moderation';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('note')
    .setDescription('Attach a staff note to a member — visible in /warnings, never counts as a warn.')
    .addUserOption((o) => o.setName('user').setDescription('The member').setRequired(true))
    .addStringOption((o) =>
      o.setName('text').setDescription('The note').setRequired(true).setMaxLength(1000),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  module: 'MODERATION',
  preconditions: [RequireGuild, RequireUserPermissions(PermissionFlagsBits.ModerateMembers)],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;
    const target = interaction.options.getUser('user', true);
    const text = interaction.options.getString('text', true);

    const note = await createModerationCase({
      guildId: interaction.guildId,
      type: 'NOTE',
      targetId: target.id,
      moderatorId: interaction.user.id,
      reason: text,
    });

    const embed = brandedEmbed({
      kind: 'info',
      title: `Case #${note.caseNumber} · Note`,
      description: [
        `**User:** ${target.tag} (\`${target.id}\`)`,
        `**Moderator:** ${interaction.user.tag}`,
        `**Note:** ${text}`,
      ].join('\n'),
    });
    // Staff-only surface: the confirmation is ephemeral and the note lands in
    // the mod log + /warnings history, never in the channel.
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    const config = await ctx.config.getConfig(interaction.guildId, 'MODERATION');
    await postModLog(ctx, interaction.guildId, config, embed);
  },
};

export default command;
