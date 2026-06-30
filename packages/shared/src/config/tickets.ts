import { z } from 'zod';

export const ticketsConfigSchema = z.object({
  /** Category new ticket channels are created under. Required to open tickets. */
  categoryId: z.string().nullable().default(null),
  /** Roles granted access to every ticket channel. */
  supportRoleIds: z.array(z.string()).default([]),
  /** Where closed-ticket transcripts are posted (blank = no transcript). */
  transcriptChannelId: z.string().nullable().default(null),
  /** Channel the "Open a ticket" panel is deployed to from the dashboard. */
  panelChannelId: z.string().nullable().default(null),
  panelTitle: z.string().max(256).default('Need help?'),
  panelDescription: z
    .string()
    .max(2000)
    .default('Click the button below to open a private support ticket.'),
  buttonLabel: z.string().min(1).max(80).default('Open a ticket'),
  openMessage: z
    .string()
    .max(1500)
    .default('Thanks for opening a ticket — support will be with you shortly.'),
  maxOpenPerUser: z.number().int().min(1).max(10).default(1),
  /** Hours of inactivity before a ticket auto-closes. 0 disables auto-close. */
  autoCloseHours: z.number().int().min(0).max(720).default(0),
});

export type TicketsConfig = z.infer<typeof ticketsConfigSchema>;
