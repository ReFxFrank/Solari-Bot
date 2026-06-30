import { z } from 'zod';

export const autoroleConfigSchema = z.object({
  /** Roles automatically granted to human members on join. */
  humanRoleIds: z.array(z.string()).default([]),
  /** Roles automatically granted to bots on join. */
  botRoleIds: z.array(z.string()).default([]),
});

export type AutoroleConfig = z.infer<typeof autoroleConfigSchema>;
