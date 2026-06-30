import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';

export default defineEvent({
  name: Events.GuildDelete,
  execute(ctx, guild) {
    // Keep the row (and its config/cases) so settings survive a re-invite.
    ctx.logger.info({ guildId: guild.id }, 'Removed from guild (data retained)');
  },
});
