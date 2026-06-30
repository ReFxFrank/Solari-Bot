import type { ClientEvents } from 'discord.js';
import type { BotContext } from './context';

/** A gateway event handler loaded from `src/events`. */
export interface BotEvent<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute(ctx: BotContext, ...args: ClientEvents[K]): Promise<void> | void;
}

/** Identity helper that preserves the event-name generic for type inference. */
export function defineEvent<K extends keyof ClientEvents>(event: BotEvent<K>): BotEvent<K> {
  return event;
}
