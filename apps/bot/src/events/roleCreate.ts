import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { brandedEmbed } from '../lib/embeds';
import { sendLog } from '../lib/logging';

export default defineEvent({
  name: Events.GuildRoleCreate,
  async execute(ctx, role) {
    const embed = brandedEmbed({
      kind: 'success',
      title: 'Role created',
      description: `<@&${role.id}> (\`${role.name}\`)`,
    });
    await sendLog(ctx, role.guild.id, 'server', embed);
  },
});
