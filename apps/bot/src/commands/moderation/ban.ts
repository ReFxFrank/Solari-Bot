import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { brandedEmbed, errorEmbed } from '../../lib/embeds';
import { RequireBotPermissions, RequireGuild, RequireUserPermissions } from '../../lib/permissions';
import { createModerationCase } from '../../lib/cases';
import { formatDuration, parseDuration } from '../../lib/parsing';
import { tempBanJobId } from '../../services/jobs';
import type { Command } from '../../framework/command';

const MAX_TEMP_SECONDS = 60 * 60 * 24 * 365; // 1 year

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member, optionally for a limited time.')
    .addUserOption((o) => o.setName('user').setDescription('The member to ban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the ban'))
    .addStringOption((o) =>
      o
        .setName('duration')
        .setDescription('Temp-ban duration, e.g. 30m, 2h, 7d (omit for permanent)'),
    )
    .addIntegerOption((o) =>
      o
        .setName('delete_days')
        .setDescription('Days of the user’s recent messages to delete (0–7)')
        .setMinValue(0)
        .setMaxValue(7),
    ),
  preconditions: [
    RequireGuild,
    RequireUserPermissions(PermissionFlagsBits.BanMembers),
    RequireBotPermissions(PermissionFlagsBits.BanMembers),
  ],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;

    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const durationInput = interaction.options.getString('duration');
    const deleteDays = interaction.options.getInteger('delete_days') ?? 0;

    if (target.id === interaction.user.id) {
      await interaction.reply({
        embeds: [errorEmbed('You can’t ban yourself.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (target.id === ctx.client.user?.id) {
      await interaction.reply({
        embeds: [errorEmbed('I can’t ban myself.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (target.id === interaction.guild.ownerId) {
      await interaction.reply({
        embeds: [errorEmbed('You can’t ban the server owner.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let durationSeconds: number | null = null;
    if (durationInput) {
      const parsed = parseDuration(durationInput);
      if (parsed === null || parsed <= 0 || parsed > MAX_TEMP_SECONDS) {
        await interaction.reply({
          embeds: [
            errorEmbed('Invalid duration. Use formats like `30m`, `2h`, `7d` (max 1 year).'),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      durationSeconds = parsed;
    }

    const isTemp = durationSeconds !== null;
    const expiresAt = isTemp ? new Date(Date.now() + durationSeconds! * 1000) : null;

    // Best-effort DM before the ban, if enabled.
    const modConfig = await ctx.config.getConfig(interaction.guildId, 'MODERATION');
    if (modConfig.dmOnAction) {
      await target
        .send(`You have been banned from **${interaction.guild.name}**.\nReason: ${reason}`)
        .catch(() => undefined);
    }

    try {
      await interaction.guild.members.ban(target.id, {
        reason: `${reason} — by ${interaction.user.tag}`,
        deleteMessageSeconds: deleteDays * 86_400,
      });
    } catch (err) {
      ctx.logger.error({ err, target: target.id }, 'Ban API call failed');
      await interaction.reply({
        embeds: [errorEmbed('I couldn’t ban that user — they may have a higher role than me.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const moderationCase = await createModerationCase({
      guildId: interaction.guildId,
      type: isTemp ? 'TEMPBAN' : 'BAN',
      targetId: target.id,
      moderatorId: interaction.user.id,
      reason,
      durationSeconds,
      expiresAt,
    });

    if (isTemp && expiresAt) {
      await ctx.jobs.scheduleTempAction(
        {
          type: 'UNBAN',
          guildId: interaction.guildId,
          userId: target.id,
          caseId: moderationCase.id,
        },
        expiresAt.getTime() - Date.now(),
        tempBanJobId(interaction.guildId, target.id),
      );
    }

    await interaction.reply({
      embeds: [
        brandedEmbed({
          kind: 'success',
          title: `Case #${moderationCase.caseNumber} · ${isTemp ? 'Temp-ban' : 'Ban'}`,
          description: [
            `**User:** ${target.tag} (\`${target.id}\`)`,
            `**Reason:** ${reason}`,
            isTemp
              ? `**Duration:** ${formatDuration(durationSeconds!)} (auto-unban scheduled)`
              : null,
          ]
            .filter(Boolean)
            .join('\n'),
        }),
      ],
    });
  },
};

export default command;
