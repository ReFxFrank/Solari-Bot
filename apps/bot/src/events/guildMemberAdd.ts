import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { scheduleMemberCountSync } from '../lib/guildSync';

export default defineEvent({
  name: Events.GuildMemberAdd,
  execute(_ctx, member) {
    scheduleMemberCountSync(member.guild);
  },
});
