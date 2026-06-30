import type { MessageComponentInteraction } from 'discord.js';
import type { BotContext } from './context';
import type { ParsedCustomId } from './customId';

/** Handler for a routed message component (`module:action:arg...`). */
export type ComponentHandler = (
  interaction: MessageComponentInteraction,
  parsed: ParsedCustomId,
  ctx: BotContext,
) => Promise<void> | void;

export interface ComponentModule {
  /** Custom-id module prefix this handler owns (e.g. `roles`). */
  module: string;
  handle: ComponentHandler;
}

export function defineComponent(component: ComponentModule): ComponentModule {
  return component;
}
