import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { scheduleMemberCountSync } from '../lib/guildSync';
import { handleMemberJoin } from '../modules/welcome';

export default defineEvent({
  name: Events.GuildMemberAdd,
  async execute(ctx, member) {
    scheduleMemberCountSync(member.guild);
    await handleMemberJoin(member, ctx);
  },
});
