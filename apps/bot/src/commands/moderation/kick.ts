import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../framework/command';
import { RequireBotPermissions, RequireGuild, RequireUserPermissions } from '../../lib/permissions';
import { brandedEmbed, errorEmbed } from '../../lib/embeds';
import { createModerationCase } from '../../lib/cases';
import { moderationTargetError, postModLog } from '../../lib/moderation';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .addUserOption((o) => o.setName('user').setDescription('The member to kick').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the kick'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  module: 'MODERATION',
  preconditions: [
    RequireGuild,
    RequireUserPermissions(PermissionFlagsBits.KickMembers),
    RequireBotPermissions(PermissionFlagsBits.KickMembers),
  ],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const config = await ctx.config.getConfig(interaction.guildId, 'MODERATION');

    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    const guardError = moderationTargetError({
      targetId: target.id,
      actorId: interaction.user.id,
      botId: ctx.client.user?.id,
      guildOwnerId: interaction.guild.ownerId,
      targetMember,
      immuneRoleIds: config.immuneRoleIds,
      actionVerb: 'kick',
    });
    if (guardError) {
      await interaction.reply({ embeds: [errorEmbed(guardError)], flags: MessageFlags.Ephemeral });
      return;
    }
    if (!targetMember) {
      await interaction.reply({
        embeds: [errorEmbed('That user isn’t in this server.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    // DM before the kick — afterwards the bot can no longer reach the member.
    if (config.dmOnAction) {
      await target
        .send(`You were kicked from **${interaction.guild.name}**.\nReason: ${reason}`)
        .catch(() => undefined);
    }

    try {
      await targetMember.kick(`${reason} — by ${interaction.user.tag}`);
    } catch (err) {
      ctx.logger.error({ err, target: target.id }, 'Kick API call failed');
      await interaction.editReply({
        embeds: [errorEmbed('I couldn’t kick that user — they may have a higher role than me.')],
      });
      return;
    }

    const moderationCase = await createModerationCase({
      guildId: interaction.guildId,
      type: 'KICK',
      targetId: target.id,
      moderatorId: interaction.user.id,
      reason,
    });

    const embed = brandedEmbed({
      kind: 'success',
      title: `Case #${moderationCase.caseNumber} · Kick`,
      description: [
        `**User:** ${target.tag} (\`${target.id}\`)`,
        `**Moderator:** ${interaction.user.tag}`,
        `**Reason:** ${reason}`,
      ].join('\n'),
    });

    await interaction.editReply({ embeds: [embed] });
    await postModLog(ctx, interaction.guildId, config, embed);
  },
};

export default command;
