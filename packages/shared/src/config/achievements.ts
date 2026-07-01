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

/** Prestige tiers, purely for display/organization (badge colour + emoji). */
export const ACHIEVEMENT_TIERS = ['bronze', 'silver', 'gold', 'diamond'] as const;
export type AchievementTier = (typeof ACHIEVEMENT_TIERS)[number];

export const ACHIEVEMENT_TIER_LABELS: Record<AchievementTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  diamond: 'Diamond',
};

export const ACHIEVEMENT_TIER_EMOJI: Record<AchievementTier, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎',
};

export const achievementSchema = z.object({
  /** Stable id (used to record who unlocked what — must not be reused). */
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(100),
  description: z.string().max(200).optional(),
  type: z.enum(ACHIEVEMENT_TYPES),
  threshold: z.number().int().min(1).max(1_000_000_000),
  /** Prestige tier (display only). */
  tier: z.enum(ACHIEVEMENT_TIERS).default('bronze'),
  /** Optional rewards granted once, on unlock. */
  rewardRoleId: z.string().nullable().default(null),
  rewardCoins: z.number().int().min(0).max(1_000_000).default(0),
  rewardXp: z.number().int().min(0).max(1_000_000).default(0),
});
export type Achievement = z.infer<typeof achievementSchema>;

/**
 * Curated starter achievements (MEE6-style), tiered across level, messages,
 * voice, and coins. Ids are assigned when they're added to a guild's config.
 */
export const ACHIEVEMENT_PRESETS: Omit<Achievement, 'id'>[] = [
  // Level milestones
  { name: 'First Steps', description: 'Reach level 5', type: 'LEVEL', threshold: 5, tier: 'bronze', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
  { name: 'Getting Comfortable', description: 'Reach level 10', type: 'LEVEL', threshold: 10, tier: 'bronze', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
  { name: 'Regular', description: 'Reach level 25', type: 'LEVEL', threshold: 25, tier: 'silver', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
  { name: 'Veteran', description: 'Reach level 50', type: 'LEVEL', threshold: 50, tier: 'gold', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
  { name: 'Legend', description: 'Reach level 100', type: 'LEVEL', threshold: 100, tier: 'diamond', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
  // Messages
  { name: 'Chatterbox', description: 'Send 100 messages', type: 'MESSAGES', threshold: 100, tier: 'bronze', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
  { name: 'Conversationalist', description: 'Send 1,000 messages', type: 'MESSAGES', threshold: 1000, tier: 'silver', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
  { name: 'Motormouth', description: 'Send 10,000 messages', type: 'MESSAGES', threshold: 10000, tier: 'gold', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
  { name: 'Voice of the Server', description: 'Send 50,000 messages', type: 'MESSAGES', threshold: 50000, tier: 'diamond', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
  // Voice
  { name: 'Present', description: 'Spend 1 hour in voice', type: 'VOICE_MINUTES', threshold: 60, tier: 'bronze', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
  { name: 'Hangout Regular', description: 'Spend 10 hours in voice', type: 'VOICE_MINUTES', threshold: 600, tier: 'silver', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
  { name: 'Voice Veteran', description: 'Spend 50 hours in voice', type: 'VOICE_MINUTES', threshold: 3000, tier: 'gold', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
  { name: 'Always Online', description: 'Spend 200 hours in voice', type: 'VOICE_MINUTES', threshold: 12000, tier: 'diamond', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
  // Coins (economy)
  { name: 'Pocket Change', description: 'Hold 1,000 coins', type: 'COINS', threshold: 1000, tier: 'bronze', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
  { name: 'Saver', description: 'Hold 10,000 coins', type: 'COINS', threshold: 10000, tier: 'silver', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
  { name: 'Big Spender', description: 'Hold 100,000 coins', type: 'COINS', threshold: 100000, tier: 'gold', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
  { name: 'Tycoon', description: 'Hold 1,000,000 coins', type: 'COINS', threshold: 1000000, tier: 'diamond', rewardRoleId: null, rewardCoins: 0, rewardXp: 0 },
];

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
