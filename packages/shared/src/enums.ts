/**
 * Shared enums. The `MODULES` list and `Module` type MUST stay in sync with
 * the `Module` enum in `packages/database/prisma/schema.prisma`.
 */

export const MODULES = [
  'MODERATION',
  'AUTOMOD',
  'LOGGING',
  'WELCOME',
  'AUTOROLE',
  'LEVELING',
  'ROLES',
  'CUSTOM_COMMANDS',
  'STARBOARD',
  'GIVEAWAYS',
  'POLLS',
  'SUGGESTIONS',
  'REMINDERS',
  'SCHEDULED_MESSAGES',
  'TICKETS',
  'STATS_COUNTERS',
  'INVITE_TRACKING',
  'BIRTHDAYS',
  'AFK',
  'ECONOMY',
  'MUSIC',
  'SOCIAL',
  'TEMP_VOICE',
  'UTILITY',
  'FUN',
] as const;

export type Module = (typeof MODULES)[number];

export const PREMIUM_TIERS = ['FREE', 'PREMIUM'] as const;
export type PremiumTier = (typeof PREMIUM_TIERS)[number];

/** Which modules are gated behind the optional premium feature-flag layer. */
export const PREMIUM_MODULES: readonly Module[] = [
  'ECONOMY',
  'MUSIC',
  'SOCIAL',
  'TEMP_VOICE',
] as const;

export const MODERATION_ACTION_TYPES = [
  'WARN',
  'MUTE',
  'KICK',
  'BAN',
  'SOFTBAN',
  'TEMPBAN',
  'UNBAN',
  'NOTE',
] as const;
export type ModerationActionType = (typeof MODERATION_ACTION_TYPES)[number];

export function isModule(value: string): value is Module {
  return (MODULES as readonly string[]).includes(value);
}
