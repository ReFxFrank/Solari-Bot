import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { brandedEmbed } from '../lib/embeds';
import { sendLog } from '../lib/logging';

export default defineEvent({
  name: Events.ChannelDelete,
  async execute(ctx, channel) {
    if (channel.isDMBased()) return;
    const embed = brandedEmbed({
      kind: 'danger',
      title: 'Channel deleted',
      description: `\`#${channel.name}\``,
    });
    await sendLog(ctx, channel.guild.id, 'server', embed);
  },
});
