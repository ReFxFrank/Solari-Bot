import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { handleMessageXp } from '../modules/leveling';
import { isTicketChannel, touchTicket } from '../modules/tickets';

export default defineEvent({
  name: Events.MessageCreate,
  async execute(ctx, message) {
    await handleMessageXp(message, ctx);
    if (!message.author.bot && isTicketChannel(message.channelId)) {
      await touchTicket(message.channelId, {
        client: ctx.client,
        jobs: ctx.jobs,
        logger: ctx.logger,
      });
    }
  },
});
