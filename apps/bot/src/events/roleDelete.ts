import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { brandedEmbed } from '../lib/embeds';
import { invalidateEntityCache } from '../lib/entityCache';
import { sendLog } from '../lib/logging';

export default defineEvent({
  name: Events.GuildRoleDelete,
  async execute(ctx, role) {
    invalidateEntityCache('roles', role.guild.id);
    const embed = brandedEmbed({
      kind: 'danger',
      title: 'Role deleted',
      description: `\`${role.name}\``,
    });
    await sendLog(ctx, role.guild.id, 'server', embed);
  },
});
