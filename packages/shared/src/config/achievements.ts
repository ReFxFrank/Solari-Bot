import { z } from 'zod';

/**
 * Achievements module (free). Server admins define milestone achievements that
 * members unlock by reaching a threshold on a tracked stat (level, messages,
 * coins, or voice minutes), each optionally granting a role / coins / XP.
 */

export const ACHIEVEMENT_TYPES = ['LEVEL', 'MESSAGES', 'COINS', 'VOICE_MINUTES'] as const;
export type AchievementType = (typeof ACHIEVEMENT_TYPES)[number];

export const ACHIEVEMENT_TYPE_LABELS: Record<AchievementType, string> = {
  LEVEL: 'Reach level',
  MESSAGES: 'Send messages',
  COINS: 'Hold coins (wallet + bank)',
  VOICE_MINUTES: 'Minutes in voice',
};

export const achievementSchema = z.object({
  /** Stable id (used to record who unlocked what — must not be reused). */
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(100),
  description: z.string().max(200).optional(),
  type: z.enum(ACHIEVEMENT_TYPES),
  threshold: z.number().int().min(1).max(1_000_000_000),
  /** Optional rewards granted once, on unlock. */
  rewardRoleId: z.string().nullable().default(null),
  rewardCoins: z.number().int().min(0).max(1_000_000).default(0),
  rewardXp: z.number().int().min(0).max(1_000_000).default(0),
});
export type Achievement = z.infer<typeof achievementSchema>;

export const achievementsConfigSchema = z.object({
  /** Announce unlocks in a channel. */
  announce: z.boolean().default(true),
  announceChannelId: z.string().nullable().default(null),
  achievements: z
    .array(achievementSchema)
    .max(50)
    .default([])
    // Duplicate ids would make "already unlocked" checks ambiguous.
    .refine((list) => new Set(list.map((a) => a.id)).size === list.length, {
      message: 'Each achievement id must be unique.',
    }),
});
export type AchievementsConfig = z.infer<typeof achievementsConfigSchema>;
