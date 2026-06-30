import { z } from 'zod';

export const welcomeConfigSchema = z.object({
  channelId: z.string().nullable().default(null),
  message: z.string().default('Welcome {user} to **{server}**! You are member #{memberCount}.'),
  dmEnabled: z.boolean().default(false),
  dmMessage: z.string().default(''),
  cardEnabled: z.boolean().default(false),
  cardBackground: z.string().url().nullable().default(null),
  leaveChannelId: z.string().nullable().default(null),
  leaveMessage: z.string().default('**{user}** has left {server}.'),
});

export type WelcomeConfig = z.infer<typeof welcomeConfigSchema>;
