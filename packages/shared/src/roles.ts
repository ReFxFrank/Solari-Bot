import { z } from 'zod';

export const rolePanelModes = ['NORMAL', 'UNIQUE', 'VERIFY'] as const;
export type RolePanelMode = (typeof rolePanelModes)[number];

export const rolePanelTypes = ['BUTTON', 'SELECT'] as const;
export type RolePanelType = (typeof rolePanelTypes)[number];

export const rolePanelOptionSchema = z.object({
  roleId: z.string().min(1),
  label: z.string().min(1).max(80),
  emoji: z.string().max(64).optional(),
  description: z.string().max(100).optional(),
});
export type RolePanelOption = z.infer<typeof rolePanelOptionSchema>;

/** Validated input for creating/updating a role panel (dashboard + bot). */
export const rolePanelInputSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().max(2000).nullable().default(null),
  channelId: z.string().nullable().default(null),
  mode: z.enum(rolePanelModes).default('NORMAL'),
  type: z.enum(rolePanelTypes).default('BUTTON'),
  // Duplicate roleIds produce duplicate component custom-ids/values, which
  // Discord rejects at send time — reject them up front instead.
  options: z
    .array(rolePanelOptionSchema)
    .min(1)
    .max(25)
    .refine((opts) => new Set(opts.map((o) => o.roleId)).size === opts.length, {
      message: 'Each role can appear only once per panel.',
    }),
});
export type RolePanelInput = z.infer<typeof rolePanelInputSchema>;
