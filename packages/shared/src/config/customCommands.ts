import { z } from 'zod';
import { embedSpecSchema } from '../embed';

/**
 * Custom commands (tags) + auto-responders (§8). Tags are stored per-row in the
 * database (looked up by name on invocation); the per-guild config here holds
 * the invocation prefix and the auto-responder list (matched against every
 * message, so it lives in the cached config rather than the DB).
 */

export const AUTO_RESPONDER_MATCHES = ['contains', 'exact', 'startswith', 'endswith'] as const;
export type AutoResponderMatch = (typeof AUTO_RESPONDER_MATCHES)[number];

export const autoResponderSchema = z.object({
  trigger: z.string().min(1).max(200),
  match: z.enum(AUTO_RESPONDER_MATCHES).default('contains'),
  response: z.string().min(1).max(2000),
  ignoreCase: z.boolean().default(true),
});
export type AutoResponder = z.infer<typeof autoResponderSchema>;

export const customCommandsConfigSchema = z.object({
  /** Prefix that triggers a tag, e.g. `!rules`. */
  prefix: z.string().min(1).max(5).default('!'),
  autoResponders: z.array(autoResponderSchema).max(50).default([]),
});
export type CustomCommandsConfig = z.infer<typeof customCommandsConfigSchema>;

/**
 * First auto-responder whose trigger matches `content`, or null. Pure and
 * substring-based only (no user-supplied regex — avoids a ReDoS surface on the
 * hot per-message path).
 */
export function matchAutoResponder(
  content: string,
  responders: AutoResponder[],
): AutoResponder | null {
  for (const responder of responders) {
    const haystack = responder.ignoreCase ? content.toLowerCase() : content;
    const needle = responder.ignoreCase ? responder.trigger.toLowerCase() : responder.trigger;
    const hit =
      responder.match === 'exact'
        ? haystack === needle
        : responder.match === 'startswith'
          ? haystack.startsWith(needle)
          : responder.match === 'endswith'
            ? haystack.endsWith(needle)
            : haystack.includes(needle);
    if (hit) return responder;
  }
  return null;
}

/** Input accepted when creating/editing a tag from the dashboard or `/tag`. */
export const customCommandInputSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(32)
      .regex(/^[a-z0-9_-]+$/, 'Use lowercase letters, numbers, - and _ only.'),
    content: z.string().max(2000).optional(),
    embed: embedSpecSchema.optional(),
  })
  .refine((data) => (data.content && data.content.trim().length > 0) || data.embed, {
    message: 'Provide message text or an embed.',
  });
export type CustomCommandInput = z.infer<typeof customCommandInputSchema>;
