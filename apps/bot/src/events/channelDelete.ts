import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { brandedEmbed } from '../lib/embeds';
import { sendLog } from '../lib/logging';
import { onTicketChannelDeleted } from '../modules/tickets';

export default defineEvent({
  name: Events.ChannelDelete,
  async execute(ctx, channel) {
    if (channel.isDMBased()) return;
    await onTicketChannelDeleted(channel.id, { jobs: ctx.jobs });
    const embed = brandedEmbed({
      kind: 'danger',
      title: 'Channel deleted',
      description: `\`#${channel.name}\``,
    });
    await sendLog(ctx, channel.guild.id, 'server', embed);
  },
});
