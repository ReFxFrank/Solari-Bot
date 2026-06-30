import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { handleStarReaction } from '../modules/starboard';

export default defineEvent({
  name: Events.MessageReactionAdd,
  async execute(ctx, reaction) {
    await handleStarReaction(reaction, ctx);
  },
});
