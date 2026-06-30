import { z } from 'zod';

export const starboardConfigSchema = z.object({
  channelId: z.string().nullable().default(null),
  /** Reaction emoji that stars a message (unicode or a custom emoji id). */
  emoji: z.string().default('⭐'),
  threshold: z.number().int().min(1).default(3),
  /** Whether an author starring their own message counts. */
  selfStar: z.boolean().default(false),
  ignoredChannelIds: z.array(z.string()).default([]),
});

export type StarboardConfig = z.infer<typeof starboardConfigSchema>;

/** Decide what to do with the board entry given the current star count. */
export function starboardAction(
  count: number,
  threshold: number,
  hasExisting: boolean,
): 'create' | 'update' | 'remove' | 'none' {
  if (count >= threshold) return hasExisting ? 'update' : 'create';
  return hasExisting ? 'remove' : 'none';
}
