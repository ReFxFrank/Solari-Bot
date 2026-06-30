import { PREMIUM_MODULES } from './enums';
import type { Module, PremiumTier } from './enums';

/**
 * Premium tier logic (§3). Billing is per-server, single-tier (Free vs Premium),
 * backed by Stripe. The bot reads the fast `Guild.premiumTier` flag; the Stripe
 * webhook is the writer. These helpers are pure so both bot and dashboard agree.
 */

/** Stripe subscription statuses that grant active premium access. */
export const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'] as const;

export function isPremiumTier(tier: PremiumTier): boolean {
  return tier === 'PREMIUM';
}

/** True if a module is gated behind premium and the tier doesn't unlock it. */
export function isModuleLocked(module: Module, tier: PremiumTier): boolean {
  return PREMIUM_MODULES.includes(module) && !isPremiumTier(tier);
}

/**
 * The effective tier implied by a Stripe subscription. `status` is the source of
 * truth (Stripe flips it to past_due/canceled itself); the period-end check is a
 * backstop in case a webhook was missed. Defaults to FREE for any non-active
 * status or missing subscription.
 */
export function tierFromSubscription(
  status: string | null | undefined,
  currentPeriodEnd: Date | null | undefined,
  now: number = Date.now(),
): PremiumTier {
  if (!status || !(ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status)) {
    return 'FREE';
  }
  if (currentPeriodEnd && currentPeriodEnd.getTime() < now) return 'FREE';
  return 'PREMIUM';
}

/** Human-facing summary of what Premium unlocks (dashboard upsell copy). */
export const PREMIUM_PERKS: readonly string[] = [
  'Economy — currency, games, shop & inventory',
  'Music — queues, filters, DJ roles & vote-skip',
  'Social Alerts — Twitch, YouTube, Reddit & RSS',
  'Temp Voice — join-to-create voice channels',
  'Higher limits across every module',
];
