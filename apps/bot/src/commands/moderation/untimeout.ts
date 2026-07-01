import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../framework/command';
import { RequireBotPermissions, RequireGuild, RequireUserPermissions } from '../../lib/permissions';
import { brandedEmbed, errorEmbed } from '../../lib/embeds';
import { postModLog } from '../../lib/moderation';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove a member’s timeout early.')
    .addUserOption((o) =>
      o.setName('user').setDescription('The member to un-timeout').setRequired(true),
    )
    .addStringOption((o) => o.setName('reason').setDescription('Reason'))
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

    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) {
      await interaction.reply({
        embeds: [errorEmbed('That user isn’t in this server.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (!targetMember.isCommunicationDisabled()) {
      await interaction.reply({
        embeds: [errorEmbed('That member isn’t currently timed out.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    try {
      await targetMember.timeout(null, `${reason} — by ${interaction.user.tag}`);
    } catch (err) {
      ctx.logger.error({ err, target: target.id }, 'Untimeout API call failed');
      await interaction.editReply({
        embeds: [errorEmbed('I couldn’t remove that member’s timeout.')],
      });
      return;
    }

    const config = await ctx.config.getConfig(interaction.guildId, 'MODERATION');
    const embed = brandedEmbed({
      kind: 'success',
      title: 'Timeout removed',
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
