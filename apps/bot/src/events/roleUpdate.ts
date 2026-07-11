import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { invalidateEntityCache } from '../lib/entityCache';

/** Keep dashboard role pickers current when a role is renamed/recolored. */
export default defineEvent({
  name: Events.GuildRoleUpdate,
  async execute(_ctx, _oldRole, newRole) {
    invalidateEntityCache('roles', newRole.guild.id);
  },
});
