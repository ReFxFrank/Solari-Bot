import { z } from 'zod';

/**
 * Auto-moderation (§8). Per-filter rules with an escalating action, plus global
 * role/channel exemptions. The content checks are pure + ReDoS-safe (no
 * user-supplied regex) so they're cheap to run on every message and testable.
 */

export const AUTOMOD_ACTIONS = ['delete', 'warn', 'timeout', 'kick', 'ban'] as const;
export type AutomodAction = (typeof AUTOMOD_ACTIONS)[number];

const ruleFields = {
  enabled: z.boolean().default(false),
  action: z.enum(AUTOMOD_ACTIONS).default('delete'),
  /** Used when action is `timeout`. */
  timeoutMinutes: z.number().int().min(1).max(10080).default(10),
};

export interface AutomodRule {
  enabled: boolean;
  action: AutomodAction;
  timeoutMinutes: number;
}

export const automodConfigSchema = z.object({
  exemptRoleIds: z.array(z.string()).default([]),
  exemptChannelIds: z.array(z.string()).default([]),
  invites: z.object({ ...ruleFields }).default({}),
  links: z.object({ ...ruleFields, allowlist: z.array(z.string()).default([]) }).default({}),
  mentions: z
    .object({ ...ruleFields, maxMentions: z.number().int().min(1).max(50).default(5) })
    .default({}),
  caps: z
    .object({
      ...ruleFields,
      percent: z.number().int().min(50).max(100).default(70),
      minLength: z.number().int().min(1).max(2000).default(10),
    })
    .default({}),
  spam: z
    .object({
      ...ruleFields,
      maxMessages: z.number().int().min(2).max(30).default(5),
      windowSeconds: z.number().int().min(1).max(60).default(5),
    })
    .default({}),
  words: z.object({ ...ruleFields, list: z.array(z.string()).max(500).default([]) }).default({}),
});

export type AutomodConfig = z.infer<typeof automodConfigSchema>;

// ── Pure content checks ──────────────────────────────────────────────────────

// Anchored to Discord invite hosts only — a bare ".gg" branch would flag every
// op.gg / start.gg / tenor.gg link.
const INVITE_RE = /(?:discord(?:app)?\.com\/invite|discord\.(?:gg|io|me|li))\/[\w-]+/i;
export function containsInvite(content: string): boolean {
  return INVITE_RE.test(content);
}

// Matches scheme / www. / path-bearing links (the forms Discord auto-linkifies)
// so a scheme-less `www.evil.com` or `evil.com/x` can't bypass the allowlist,
// while bare dotted prose ("node.js") with no scheme/www/path is left alone.
// Userinfo and :port are captured separately so the host compares cleanly.
//                  1:scheme/www         userinfo          2:host                  3:port    4:path
const LINK_RE =
  /(https?:\/\/|www\.)?(?:[^\s/@]+@)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)(:\d+)?(\/[^\s]*)?/gi;

/** True if the content has any link whose host isn't covered by the allowlist. */
export function containsDisallowedLink(content: string, allowlist: string[]): boolean {
  const allow = allowlist.map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  for (const match of content.matchAll(LINK_RE)) {
    // Only treat it as a link if it carries a scheme/www prefix or a path —
    // otherwise it's likely ordinary prose with a dot.
    if (!match[1] && !match[4]) continue;
    const host = (match[2] ?? '').toLowerCase();
    if (!host) continue;
    const ok = allow.some((domain) => host === domain || host.endsWith(`.${domain}`));
    if (!ok) return true;
  }
  return false;
}

/** Percentage of letters that are uppercase ≥ `percent`, once long enough. */
export function exceedsCaps(content: string, percent: number, minLength: number): boolean {
  const letters = content.replace(/[^a-zA-Z]/g, '');
  if (letters.length < minLength) return false;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return (upper / letters.length) * 100 >= percent;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The first blocked word found (whole-word, case-insensitive), or null. Words
 * are escaped and joined into a single alternation — one safe regex per call,
 * no user-controlled quantifiers (ReDoS-safe).
 */
export function matchBlockedWord(content: string, words: string[]): string | null {
  const cleaned = words.map((word) => word.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  const matcher = new RegExp(`\\b(?:${cleaned.map(escapeRegex).join('|')})\\b`, 'i');
  const found = content.match(matcher);
  return found ? found[0] : null;
}
