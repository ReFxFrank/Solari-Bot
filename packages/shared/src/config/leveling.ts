import { z } from 'zod';

export const levelUpAnnounceModes = ['CHANNEL', 'CURRENT', 'DM', 'OFF'] as const;

export const levelingConfigSchema = z.object({
  textXpMin: z.number().int().min(0).default(15),
  textXpMax: z.number().int().min(0).default(25),
  xpCooldownSeconds: z.number().int().min(0).default(60),
  voiceXpPerMinute: z.number().int().min(0).default(10),
  announce: z.enum(levelUpAnnounceModes).default('CURRENT'),
  announceChannelId: z.string().nullable().default(null),
  levelUpMessage: z.string().default('GG {user}, you reached level **{level}**!'),
  cardEnabled: z.boolean().default(true),
  noXpRoleIds: z.array(z.string()).default([]),
  noXpChannelIds: z.array(z.string()).default([]),
  /** Role rewards granted at a level. */
  rewards: z.array(z.object({ level: z.number().int().min(1), roleId: z.string() })).default([]),
  /** Keep lower reward roles (true) or replace with the highest earned (false). */
  roleRewardStack: z.boolean().default(true),
  /** Expose this server's leaderboard on a public, no-login page. */
  publicLeaderboard: z.boolean().default(true),
});

export type LevelingConfig = z.infer<typeof levelingConfigSchema>;
