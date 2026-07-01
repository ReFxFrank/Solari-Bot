import { MessageFlags } from 'discord.js';
import { errorEmbed } from '../lib/embeds';
import { defineComponent } from '../framework/component';
import { closeTicket, openTicket } from '../modules/tickets';

export default defineComponent({
  module: 'ticket',
  async handle(interaction, parsed, ctx) {
    // Modals route through this registry too; this module only owns components.
    if (interaction.isModalSubmit()) return;
    if (!interaction.inCachedGuild()) return;
    const deps = { client: ctx.client, jobs: ctx.jobs, logger: ctx.logger };

    if (parsed.action === 'open') {
      if (!(await ctx.config.isEnabled(interaction.guildId, 'TICKETS'))) {
        await interaction.reply({
          embeds: [errorEmbed('Tickets are disabled on this server.')],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const result = await openTicket(interaction.guild, interaction.user.id, deps);
      if ('error' in result) {
        await interaction.editReply({ embeds: [errorEmbed(result.error)] });
      } else {
        await interaction.editReply({ content: `Your ticket is ready: <#${result.channelId}>` });
      }
      return;
    }

    if (parsed.action === 'close') {
      // Ack before the channel is deleted so the ephemeral reply is delivered.
      await interaction
        .reply({ content: 'Closing this ticket…', flags: MessageFlags.Ephemeral })
        .catch(() => undefined);
      const closed = await closeTicket(
        interaction.channelId,
        interaction.user.id,
        deps,
        `closed by ${interaction.user.tag}`,
      );
      if (!closed) {
        await interaction
          .followUp({
            embeds: [errorEmbed('This isn’t an open ticket channel.')],
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => undefined);
      }
    }
  },
});
