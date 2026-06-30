import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { scheduleMemberCountSync } from '../lib/guildSync';
import { handleMemberLeave } from '../modules/welcome';

export default defineEvent({
  name: Events.GuildMemberRemove,
  async execute(ctx, member) {
    scheduleMemberCountSync(member.guild);
    await handleMemberLeave(member, ctx);
  },
});
