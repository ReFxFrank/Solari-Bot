import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { brandedEmbed } from '../lib/embeds';
import { sendLog } from '../lib/logging';

export default defineEvent({
  name: Events.MessageBulkDelete,
  async execute(ctx, messages, channel) {
    if (channel.isDMBased()) return;
    const embed = brandedEmbed({
      kind: 'danger',
      title: 'Bulk message delete',
      description: `**${messages.size}** messages deleted in <#${channel.id}>`,
    });
    await sendLog(ctx, channel.guild.id, 'message', embed, { channelId: channel.id });
  },
});
