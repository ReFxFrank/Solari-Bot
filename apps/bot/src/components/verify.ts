import { MessageFlags } from 'discord.js';
import { errorEmbed } from '../lib/embeds';
import { defineComponent } from '../framework/component';
import {
  handleCaptchaSubmit,
  promptCaptchaModal,
  startVerification,
} from '../modules/verification';

export default defineComponent({
  module: 'verify',
  async handle(interaction, parsed, ctx) {
    if (!interaction.inCachedGuild()) return;

    if (!(await ctx.config.isEnabled(interaction.guildId, 'VERIFICATION'))) {
      await interaction.reply({
        embeds: [errorEmbed('Verification is disabled on this server.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Captcha modal submit.
    if (interaction.isModalSubmit()) {
      if (parsed.action === 'submit') await handleCaptchaSubmit(interaction, ctx);
      return;
    }

    if (!interaction.isButton()) return;
    if (parsed.action === 'do') await startVerification(interaction, ctx);
    else if (parsed.action === 'code') await promptCaptchaModal(interaction, ctx);
  },
});
