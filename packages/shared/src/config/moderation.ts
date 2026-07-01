import { z } from 'zod';

/** Auto-punishment applied by the warn-escalation ladder. */
export const ESCALATION_ACTIONS = ['timeout', 'kick', 'ban'] as const;
export type EscalationAction = (typeof ESCALATION_ACTIONS)[number];

/**
 * One rung of the warn-escalation ladder: when a member's active warn count
 * reaches `threshold`, `action` is applied automatically. `durationMinutes`
 * is only used by `timeout` (Discord caps timeouts at 28 days = 40320 min).
 */
export const escalationRungSchema = z.object({
  threshold: z.number().int().min(1).max(100),
  action: z.enum(ESCALATION_ACTIONS).default('timeout'),
  durationMinutes: z.number().int().min(1).max(40_320).default(60),
});
export type EscalationRung = z.infer<typeof escalationRungSchema>;

export const moderationConfigSchema = z.object({
  /** Roles treated as moderators by the permission resolver (§5.2). */
  modRoleIds: z.array(z.string()).default([]),
  /** Roles treated as admins by the permission resolver. */
  adminRoleIds: z.array(z.string()).default([]),
  /** Roles immune to moderation actions (warn/mute/kick/ban refuse to target them). */
  immuneRoleIds: z.array(z.string()).default([]),
  /** Role applied for legacy mutes (timeouts are preferred when possible). */
  muteRoleId: z.string().nullable().default(null),
  /** DM the target when a moderation action is taken against them. */
  dmOnAction: z.boolean().default(true),
  /** Seconds of message history to delete on ban (0–604800). */
  deleteMessageSeconds: z.number().int().min(0).max(604_800).default(0),
  /** Channel that receives the case log. */
  modLogChannelId: z.string().nullable().default(null),
  /**
   * Warn-escalation ladder. Each new warn that brings a member's active warn
   * count to a rung's `threshold` triggers that rung's action. Sorted/applied
   * by exact count match, so each threshold fires once.
   */
  escalation: z.array(escalationRungSchema).max(20).default([]),
});

export type ModerationConfig = z.infer<typeof moderationConfigSchema>;
