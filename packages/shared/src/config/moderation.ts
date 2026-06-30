import { z } from 'zod';

export const moderationConfigSchema = z.object({
  /** Roles treated as moderators by the permission resolver (§5.2). */
  modRoleIds: z.array(z.string()).default([]),
  /** Roles treated as admins by the permission resolver. */
  adminRoleIds: z.array(z.string()).default([]),
  /** Role applied for legacy mutes (timeouts are preferred when possible). */
  muteRoleId: z.string().nullable().default(null),
  /** DM the target when a moderation action is taken against them. */
  dmOnAction: z.boolean().default(true),
  /** Seconds of message history to delete on ban (0–604800). */
  deleteMessageSeconds: z.number().int().min(0).max(604_800).default(0),
  /** Channel that receives the case log. */
  modLogChannelId: z.string().nullable().default(null),
});

export type ModerationConfig = z.infer<typeof moderationConfigSchema>;
