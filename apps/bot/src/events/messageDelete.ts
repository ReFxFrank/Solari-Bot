import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { brandedEmbed } from '../lib/embeds';
import { sendLog } from '../lib/logging';

export default defineEvent({
  name: Events.MessageDelete,
  async execute(ctx, message) {
    if (!message.guild || message.author?.bot) return;
    const embed = brandedEmbed({ kind: 'danger', title: 'Message deleted' })
      .setDescription(message.content?.slice(0, 1024) || '*content not cached*')
      .addFields(
        {
          name: 'Author',
          value: message.author ? `<@${message.author.id}>` : 'Unknown',
          inline: true,
        },
        { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
      );
    await sendLog(ctx, message.guild.id, 'message', embed, {
      channelId: message.channelId,
      userId: message.author?.id ?? null,
    });
  },
});
