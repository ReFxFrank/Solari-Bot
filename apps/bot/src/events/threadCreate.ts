import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { bumpMemberStat } from '../lib/memberStats';
import { evaluateAchievements } from '../modules/achievements';

export default defineEvent({
  name: Events.ThreadCreate,
  async execute(ctx, thread, newlyCreated) {
    if (!newlyCreated || !thread.guildId || !thread.ownerId) return;
    if (!(await ctx.config.isEnabled(thread.guildId, 'ACHIEVEMENTS'))) return;
    await bumpMemberStat(thread.guildId, thread.ownerId, 'threadsCreated');
    await evaluateAchievements(thread.guildId, thread.ownerId, ctx);
  },
});
