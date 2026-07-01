import type { MessageComponentInteraction, ModalSubmitInteraction } from 'discord.js';
import type { BotContext } from './context';
import type { ParsedCustomId } from './customId';

/**
 * Interactions routed through the `module:action:arg...` custom-id scheme.
 * Modals share the registry with buttons/selects (a captcha modal belongs to
 * the same `verify` module as its buttons), so handlers that only expect
 * message components must narrow (`if (!interaction.isButton()) return;`).
 */
export type RoutedInteraction = MessageComponentInteraction | ModalSubmitInteraction;

/** Handler for a routed component or modal (`module:action:arg...`). */
export type ComponentHandler = (
  interaction: RoutedInteraction,
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
