import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { handleStarReaction } from '../modules/starboard';
import { bumpMemberStat } from '../lib/memberStats';
import { evaluateAchievements } from '../modules/achievements';

export default defineEvent({
  name: Events.MessageReactionAdd,
  async execute(ctx, reaction, user) {
    await handleStarReaction(reaction, ctx);

    const guildId = reaction.message.guildId;
    if (user.bot || !guildId) return;
    if (!(await ctx.config.isEnabled(guildId, 'ACHIEVEMENTS'))) return;
    await bumpMemberStat(guildId, user.id, 'reactionsAdded');
    await evaluateAchievements(guildId, user.id, ctx);
  },
});
