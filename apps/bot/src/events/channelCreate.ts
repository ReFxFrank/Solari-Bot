import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { brandedEmbed } from '../lib/embeds';
import { sendLog } from '../lib/logging';

export default defineEvent({
  name: Events.ChannelCreate,
  async execute(ctx, channel) {
    const embed = brandedEmbed({
      kind: 'success',
      title: 'Channel created',
      description: `<#${channel.id}> (\`${channel.name}\`)`,
    });
    await sendLog(ctx, channel.guild.id, 'server', embed);
  },
});
