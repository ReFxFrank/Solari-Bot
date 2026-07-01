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
  /** Discord account must be at least this old to verify. 0 disables. */
  minAccountAgeHours: z.number().int().min(0).max(8760).default(0),
  /** Member must have been in the server this long to verify. 0 disables. */
  minServerAgeMinutes: z.number().int().min(0).max(10_080).default(0),
});

export type VerificationConfig = z.infer<typeof verificationConfigSchema>;

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/** Compact remaining-wait string, e.g. "2h 05m" / "12m". */
function formatWait(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / MINUTE_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/**
 * Anti-alt gate: returns a user-facing error when the member doesn't yet meet
 * the account-age / membership-age requirements, or null when they may verify.
 * Pure (all timestamps injected) so it's unit-testable.
 */
export function verificationGateError(
  config: Pick<VerificationConfig, 'minAccountAgeHours' | 'minServerAgeMinutes'>,
  accountCreatedMs: number,
  joinedAtMs: number | null,
  nowMs: number,
): string | null {
  if (config.minAccountAgeHours > 0) {
    const requiredMs = config.minAccountAgeHours * HOUR_MS;
    const remaining = accountCreatedMs + requiredMs - nowMs;
    if (remaining > 0) {
      return (
        `Your Discord account is too new to verify here — try again in **${formatWait(remaining)}** ` +
        `(accounts must be at least ${config.minAccountAgeHours}h old).`
      );
    }
  }
  if (config.minServerAgeMinutes > 0) {
    // No join timestamp (uncached partial) fails CLOSED — the gate exists to
    // keep instant alts out, so an unknown join time must not bypass it.
    if (joinedAtMs === null) {
      return 'I can’t confirm when you joined yet — try again in a few minutes.';
    }
    const requiredMs = config.minServerAgeMinutes * MINUTE_MS;
    const remaining = joinedAtMs + requiredMs - nowMs;
    if (remaining > 0) {
      return (
        `You joined too recently to verify — try again in **${formatWait(remaining)}** ` +
        `(members must wait ${config.minServerAgeMinutes}m after joining).`
      );
    }
  }
  return null;
}
