import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { brandedEmbed, errorEmbed } from '../../lib/embeds';
import { RequireBotPermissions, RequireGuild, RequireUserPermissions } from '../../lib/permissions';
import { createModerationCase, deactivateTempBans } from '../../lib/cases';
import { tempBanJobId } from '../../services/jobs';
import type { Command } from '../../framework/command';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Lift a ban by user ID.')
    .addStringOption((o) =>
      o.setName('user_id').setDescription('The ID of the banned user').setRequired(true),
    )
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the unban')),
  preconditions: [
    RequireGuild,
    RequireUserPermissions(PermissionFlagsBits.BanMembers),
    RequireBotPermissions(PermissionFlagsBits.BanMembers),
  ],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;

    const userId = interaction.options.getString('user_id', true).trim();
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!/^\d{17,20}$/.test(userId)) {
      await interaction.reply({
        embeds: [errorEmbed('That doesn’t look like a valid user ID.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    try {
      await interaction.guild.bans.remove(userId, `${reason} — by ${interaction.user.tag}`);
    } catch {
      await interaction.editReply({
        embeds: [errorEmbed('That user isn’t banned, or the ID is wrong.')],
      });
      return;
    }

    // Cancel any scheduled auto-unban and resolve the temp-ban case(s).
    await ctx.jobs.cancelTempAction(tempBanJobId(interaction.guildId, userId));
    await deactivateTempBans(interaction.guildId, userId);

    const moderationCase = await createModerationCase({
      guildId: interaction.guildId,
      type: 'UNBAN',
      targetId: userId,
      moderatorId: interaction.user.id,
      reason,
    });

    await interaction.editReply({
      embeds: [
        brandedEmbed({
          kind: 'success',
          title: `Case #${moderationCase.caseNumber} · Unban`,
          description: `**User:** \`${userId}\`\n**Reason:** ${reason}`,
        }),
      ],
    });
  },
};

export default command;
