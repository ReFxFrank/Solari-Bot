import { z } from 'zod';

/**
 * Temp Voice module config (premium). "Join-to-create" voice channels: joining a
 * hub channel spawns a personal voice channel the joiner owns and can rename /
 * limit / lock via /voice. Empty temp channels are auto-deleted.
 */
export const tempVoiceConfigSchema = z.object({
  /** Hub voice channels — joining one creates a temp channel for the member. */
  hubChannelIds: z.array(z.string()).default([]),
  /** Category to create temp channels under (null = same category as the hub). */
  categoryId: z.string().nullable().default(null),
  /** Name template for created channels. `{user}` = the owner's display name. */
  nameTemplate: z.string().min(1).max(100).default("{user}'s channel"),
  /** Default user limit for created channels (0 = unlimited). */
  defaultUserLimit: z.number().int().min(0).max(99).default(0),
});

export type TempVoiceConfig = z.infer<typeof tempVoiceConfigSchema>;
