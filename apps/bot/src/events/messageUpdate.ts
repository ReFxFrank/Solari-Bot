import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { brandedEmbed } from '../lib/embeds';
import { sendLog } from '../lib/logging';
import { handleAutomodMessage } from '../modules/automod';

export default defineEvent({
  name: Events.MessageUpdate,
  async execute(ctx, oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;

    // Re-scan edits so an edit can't smuggle content past automod.
    const full = newMessage.partial ? await newMessage.fetch().catch(() => null) : newMessage;
    if (full && full.inGuild() && !full.author.bot) {
      if (await ctx.config.isEnabled(full.guildId, 'AUTOMOD')) {
        const acted = await handleAutomodMessage(full, ctx, true);
        if (acted) return; // message removed; skip the edit log
      }
    }

    if (oldMessage.content === newMessage.content) return; // ignore embed-only edits
    const embed = brandedEmbed({ kind: 'warning', title: 'Message edited' }).addFields(
      { name: 'Before', value: (oldMessage.content || '*unavailable*').slice(0, 1024) },
      { name: 'After', value: (newMessage.content || '*unavailable*').slice(0, 1024) },
      {
        name: 'Author',
        value: newMessage.author ? `<@${newMessage.author.id}>` : 'Unknown',
        inline: true,
      },
      { name: 'Channel', value: `<#${newMessage.channelId}>`, inline: true },
    );
    await sendLog(ctx, newMessage.guild.id, 'message', embed, {
      channelId: newMessage.channelId,
      userId: newMessage.author?.id ?? null,
    });
  },
});
