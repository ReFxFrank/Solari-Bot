import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  type BaseMessageOptions,
  type ButtonInteraction,
  type GuildMember,
} from 'discord.js';
import type { VerificationConfig } from '@helios/shared';
import { brandedEmbed, errorEmbed } from '../lib/embeds';
import { buildCustomId } from '../framework/customId';
import type { BotContext } from '../framework/context';

/** The message + button posted by `/verification panel`. */
export function buildVerificationPanel(config: VerificationConfig): BaseMessageOptions {
  const embed = brandedEmbed({ title: config.panelTitle, description: config.panelMessage });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('verify', 'do'))
      .setLabel(config.buttonLabel)
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
  );
  return { embeds: [embed], components: [row] };
}

/** Add the optional "unverified" gate role when a member joins. */
export async function handleVerificationJoin(member: GuildMember, ctx: BotContext): Promise<void> {
  const { verification } = await ctx.config.getConfig(member.guild.id, 'AUTOMOD');
  if (!verification.enabled || !verification.unverifiedRoleId || member.user.bot) return;

  const role = member.guild.roles.cache.get(verification.unverifiedRoleId);
  const me = member.guild.members.me;
  if (!role || !me || role.position >= me.roles.highest.position) return;

  await member.roles
    .add(role.id, 'Verification gate')
    .catch((err: unknown) =>
      ctx.logger.warn({ err, guildId: member.guild.id }, 'Failed to add unverified role on join'),
    );
}

/** Handle a click on the verification button. */
export async function verifyMember(interaction: ButtonInteraction, ctx: BotContext): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const { verification } = await ctx.config.getConfig(interaction.guildId, 'AUTOMOD');

  if (!verification.enabled || !verification.verifiedRoleId) {
    await interaction.reply({
      embeds: [errorEmbed('Verification isn’t set up on this server.')],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const role = interaction.guild.roles.cache.get(verification.verifiedRoleId);
  if (!role) {
    await interaction.reply({
      embeds: [errorEmbed('The verified role no longer exists — ask an admin to fix the config.')],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const me = interaction.guild.members.me;
  if (
    !me ||
    !me.permissions.has(PermissionFlagsBits.ManageRoles) ||
    role.position >= me.roles.highest.position
  ) {
    await interaction.reply({
      embeds: [
        errorEmbed(
          'I can’t assign the verified role — move my role above it and grant Manage Roles.',
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const member = interaction.member;
  if (member.roles.cache.has(role.id)) {
    await interaction.reply({
      content: 'You’re already verified. ✅',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    await member.roles.add(role.id, 'Verification');
    if (verification.unverifiedRoleId && member.roles.cache.has(verification.unverifiedRoleId)) {
      await member.roles
        .remove(verification.unverifiedRoleId, 'Verification')
        .catch(() => undefined);
    }
  } catch (err) {
    ctx.logger.warn({ err, guildId: interaction.guildId }, 'Verification role assignment failed');
    await interaction.editReply({
      embeds: [errorEmbed('I couldn’t assign the role — check that my permissions are intact.')],
    });
    return;
  }

  await interaction.editReply({ content: verification.successMessage });
}
