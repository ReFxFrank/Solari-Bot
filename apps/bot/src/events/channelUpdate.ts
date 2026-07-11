import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { invalidateEntityCache } from '../lib/entityCache';

/** Keep dashboard channel pickers current when a channel is renamed/moved. */
export default defineEvent({
  name: Events.ChannelUpdate,
  async execute(_ctx, _oldChannel, newChannel) {
    if (newChannel.isDMBased()) return;
    invalidateEntityCache('channels', newChannel.guild.id);
  },
});
