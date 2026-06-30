import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { brandedEmbed } from '../lib/embeds';
import { sendLog } from '../lib/logging';

export default defineEvent({
  name: Events.GuildBanAdd,
  async execute(ctx, ban) {
    const embed = brandedEmbed({ kind: 'danger', title: 'Member banned' })
      .setDescription(`<@${ban.user.id}> (\`${ban.user.tag}\`)`)
      .addFields({ name: 'Reason', value: ban.reason || 'No reason provided' });
    await sendLog(ctx, ban.guild.id, 'member', embed, { userId: ban.user.id });
  },
});
