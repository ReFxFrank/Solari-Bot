import { z } from 'zod';

/**
 * Verification module — a join gate protecting the server from bots and
 * throwaway accounts (auth.gg/Wick-style). A panel posts a Verify button;
 * depending on `method` a click either grants the verified role directly
 * (`button`) or first requires solving a generated image captcha (`captcha`).
 * Failing the captcha too many times can kick the member. Optionally an
 * "unverified" gate role is auto-applied on join and removed on verify.
 */

export const VERIFICATION_METHODS = ['button', 'captcha'] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const VERIFICATION_METHOD_LABELS: Record<VerificationMethod, string> = {
  button: 'Button click',
  captcha: 'Image captcha',
};

export const VERIFICATION_FAIL_ACTIONS = ['none', 'kick'] as const;
export type VerificationFailAction = (typeof VERIFICATION_FAIL_ACTIONS)[number];

export const verificationConfigSchema = z.object({
  /** How members prove they're human. */
  method: z.enum(VERIFICATION_METHODS).default('button'),
  /** Granted on successful verification. Required for the gate to work. */
  verifiedRoleId: z.string().default(''),
  /** Optional role added on join and removed on verify (the "gate"). */
  unverifiedRoleId: z.string().default(''),
  buttonLabel: z.string().min(1).max(80).default('Verify'),
  panelTitle: z.string().min(1).max(256).default('Verification'),
  panelMessage: z
    .string()
    .min(1)
    .max(2000)
    .default('Click the button below to verify and unlock the rest of the server.'),
  successMessage: z.string().min(1).max(2000).default('You are now verified. Welcome aboard!'),
  /** Channel the panel deploys to from the dashboard (slash command can override). */
  panelChannelId: z.string().nullable().default(null),
  /** Number of characters in a generated captcha. */
  captchaLength: z.number().int().min(4).max(8).default(5),
  /** Captcha attempts before `failAction` applies. */
  maxAttempts: z.number().int().min(1).max(10).default(3),
  /** What happens when a member exhausts their captcha attempts. */
  failAction: z.enum(VERIFICATION_FAIL_ACTIONS).default('none'),
  /** Where verification passes/failures are logged. Null disables logging. */
  logChannelId: z.string().nullable().default(null),
});

export type VerificationConfig = z.infer<typeof verificationConfigSchema>;
