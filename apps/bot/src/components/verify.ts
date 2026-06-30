import { MessageFlags } from 'discord.js';
import { errorEmbed } from '../lib/embeds';
import { defineComponent } from '../framework/component';
import { verifyMember } from '../modules/verification';

export default defineComponent({
  module: 'verify',
  async handle(interaction, parsed, ctx) {
    if (!interaction.inCachedGuild() || !interaction.isButton()) return;
    if (parsed.action !== 'do') return;

    if (!(await ctx.config.isEnabled(interaction.guildId, 'AUTOMOD'))) {
      await interaction.reply({
        embeds: [errorEmbed('Verification is disabled on this server.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await verifyMember(interaction, ctx);
  },
});
