import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { brandedEmbed } from '../lib/embeds';
import { sendLog } from '../lib/logging';

export default defineEvent({
  name: Events.GuildBanRemove,
  async execute(ctx, ban) {
    const embed = brandedEmbed({ kind: 'success', title: 'Member unbanned' }).setDescription(
      `<@${ban.user.id}> (\`${ban.user.tag}\`)`,
    );
    await sendLog(ctx, ban.guild.id, 'member', embed, { userId: ban.user.id });
  },
});
