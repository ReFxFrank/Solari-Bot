import { z } from 'zod';

export const logCategories = ['message', 'member', 'server', 'voice'] as const;
export type LogCategory = (typeof logCategories)[number];

export const loggingConfigSchema = z.object({
  /** Per-category log channels — null disables that category. */
  messageChannelId: z.string().nullable().default(null),
  memberChannelId: z.string().nullable().default(null),
  serverChannelId: z.string().nullable().default(null),
  voiceChannelId: z.string().nullable().default(null),
  /** Ignore lists — events touching these are never logged. */
  ignoredChannelIds: z.array(z.string()).default([]),
  ignoredRoleIds: z.array(z.string()).default([]),
  ignoredUserIds: z.array(z.string()).default([]),
});

export type LoggingConfig = z.infer<typeof loggingConfigSchema>;
