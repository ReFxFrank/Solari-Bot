import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { bumpMemberStat } from '../lib/memberStats';
import { evaluateAchievements } from '../modules/achievements';

export default defineEvent({
  name: Events.ThreadMembersUpdate,
  async execute(ctx, addedMembers, _removedMembers, thread) {
    if (!thread.guildId || addedMembers.size === 0) return;
    if (!(await ctx.config.isEnabled(thread.guildId, 'ACHIEVEMENTS'))) return;
    for (const member of addedMembers.values()) {
      if (member.guildMember?.user.bot) continue;
      await bumpMemberStat(thread.guildId, member.id, 'threadsJoined');
      await evaluateAchievements(thread.guildId, member.id, ctx);
    }
  },
});
