import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { scheduleMemberCountSync } from '../lib/guildSync';
import { handleMemberLeave } from '../modules/welcome';
import { brandedEmbed } from '../lib/embeds';
import { sendLog } from '../lib/logging';
import { recordMemberFlowInsight } from '../lib/insights';

export default defineEvent({
  name: Events.GuildMemberRemove,
  async execute(ctx, member) {
    scheduleMemberCountSync(member.guild);
    recordMemberFlowInsight(ctx.redis, member.guild.id, 'leaves');
    await handleMemberLeave(member, ctx);

    const embed = brandedEmbed({ kind: 'warning', title: 'Member left' }).setDescription(
      `<@${member.id}> (\`${member.user?.tag ?? member.id}\`)`,
    );
    await sendLog(ctx, member.guild.id, 'member', embed, { userId: member.id });
  },
});
