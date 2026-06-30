import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { brandedEmbed } from '../../lib/embeds';
import { Cooldown } from '../../lib/permissions';
import type { Command } from '../../framework/command';

const command: Command = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Check the bot’s latency.'),
  preconditions: [Cooldown(5)],
  async execute(interaction, ctx) {
    const ws = Math.round(ctx.client.ws.ping);
    await interaction.reply({
      embeds: [
        brandedEmbed({
          kind: 'info',
          title: 'Pong 🏓',
          description: `WebSocket latency: \`${ws < 0 ? 'connecting…' : `${ws}ms`}\``,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
