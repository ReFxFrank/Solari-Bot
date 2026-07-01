import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../framework/command';
import { RequireBotPermissions, RequireGuild, RequireUserPermissions } from '../../lib/permissions';
import { brandedEmbed, errorEmbed } from '../../lib/embeds';
import { createModerationCase } from '../../lib/cases';
import { moderationTargetError, postModLog } from '../../lib/moderation';
import { formatDuration, parseDuration } from '../../lib/parsing';

// Discord caps timeouts at 28 days.
const MAX_TIMEOUT_SECONDS = 28 * 24 * 60 * 60;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Time out (mute) a member for a duration.')
    .addUserOption((o) =>
      o.setName('user').setDescription('The member to time out').setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName('duration')
        .setDescription('Duration, e.g. 10m, 2h, 1d (max 28d)')
        .setRequired(true),
    )
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the timeout'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  module: 'MODERATION',
  preconditions: [
    RequireGuild,
    RequireUserPermissions(PermissionFlagsBits.ModerateMembers),
    RequireBotPermissions(PermissionFlagsBits.ModerateMembers),
  ],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const durationInput = interaction.options.getString('duration', true);
    const config = await ctx.config.getConfig(interaction.guildId, 'MODERATION');

    const seconds = parseDuration(durationInput);
    if (seconds === null || seconds <= 0 || seconds > MAX_TIMEOUT_SECONDS) {
      await interaction.reply({
        embeds: [errorEmbed('Invalid duration. Use formats like `10m`, `2h`, `1d` (max 28d).')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    const guardError = moderationTargetError({
      targetId: target.id,
      actorId: interaction.user.id,
      botId: ctx.client.user?.id,
      guildOwnerId: interaction.guild.ownerId,
      targetMember,
      immuneRoleIds: config.immuneRoleIds,
      actionVerb: 'time out',
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

    try {
      await targetMember.timeout(seconds * 1000, `${reason} — by ${interaction.user.tag}`);
    } catch (err) {
      ctx.logger.error({ err, target: target.id }, 'Timeout API call failed');
      await interaction.editReply({
        embeds: [errorEmbed('I couldn’t time out that user — they may have a higher role than me.')],
      });
      return;
    }

    if (config.dmOnAction) {
      await target
        .send(
          `You were timed out in **${interaction.guild.name}** for ${formatDuration(seconds)}.\nReason: ${reason}`,
        )
        .catch(() => undefined);
    }

    const moderationCase = await createModerationCase({
      guildId: interaction.guildId,
      type: 'MUTE',
      targetId: target.id,
      moderatorId: interaction.user.id,
      reason,
      durationSeconds: seconds,
      expiresAt: new Date(Date.now() + seconds * 1000),
    });

    const embed = brandedEmbed({
      kind: 'success',
      title: `Case #${moderationCase.caseNumber} · Timeout`,
      description: [
        `**User:** ${target.tag} (\`${target.id}\`)`,
        `**Moderator:** ${interaction.user.tag}`,
        `**Duration:** ${formatDuration(seconds)}`,
        `**Reason:** ${reason}`,
      ].join('\n'),
    });

    await interaction.editReply({ embeds: [embed] });
    await postModLog(ctx, interaction.guildId, config, embed);
  },
};

export default command;
