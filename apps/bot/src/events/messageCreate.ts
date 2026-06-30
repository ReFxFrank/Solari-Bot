import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { handleMessageXp } from '../modules/leveling';

export default defineEvent({
  name: Events.MessageCreate,
  async execute(ctx, message) {
    await handleMessageXp(message, ctx);
  },
});
