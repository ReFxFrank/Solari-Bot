import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { setMemberFlag } from '../lib/memberStats';
import { evaluateAchievements } from '../modules/achievements';

export default defineEvent({
  name: Events.GuildMemberUpdate,
  async execute(ctx, oldMember, newMember) {
    // Member started boosting: premiumSince transitions from null → set.
    if (oldMember.premiumSince || !newMember.premiumSince) return;
    if (!(await ctx.config.isEnabled(newMember.guild.id, 'ACHIEVEMENTS'))) return;
    await setMemberFlag(newMember.guild.id, newMember.id, 'boosted');
    await evaluateAchievements(newMember.guild.id, newMember.id, ctx);
  },
});
