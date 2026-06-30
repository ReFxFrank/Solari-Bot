import { MessageFlags } from 'discord.js';
import { prisma } from '@helios/database';
import { defineComponent } from '../framework/component';

export default defineComponent({
  module: 'giveaway',
  async handle(interaction, parsed, _ctx) {
    if (parsed.action !== 'enter' || !interaction.inCachedGuild()) return;
    const giveawayId = parsed.args[0];
    if (!giveawayId) return;

    const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId } });
    if (!giveaway || giveaway.guildId !== interaction.guildId) {
      await interaction.reply({
        content: 'This giveaway no longer exists.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (giveaway.ended) {
      await interaction.reply({
        content: 'This giveaway has ended.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const requirements = (giveaway.requirements as { roleIds?: string[] }) ?? {};
    const requiredRoleIds = requirements.roleIds ?? [];
    if (requiredRoleIds.length > 0) {
      const memberRoles = interaction.member.roles.cache;
      const meetsRequirement = requiredRoleIds.every((id) => memberRoles.has(id));
      if (!meetsRequirement) {
        await interaction.reply({
          content: `You need ${requiredRoleIds.map((id) => `<@&${id}>`).join(', ')} to enter.`,
          flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [] },
        });
        return;
      }
    }

    try {
      await prisma.giveawayEntry.create({
        data: { giveawayId: giveaway.id, userId: interaction.user.id },
      });
      await interaction.reply({
        content: '🎉 You’re entered. Good luck!',
        flags: MessageFlags.Ephemeral,
      });
    } catch {
      // unique violation — already entered
      await interaction.reply({
        content: 'You’re already entered.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
});
