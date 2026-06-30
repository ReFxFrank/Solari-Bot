import Stripe from 'stripe';

/**
 * Server-only Stripe client (§3). Lazily constructed from STRIPE_SECRET_KEY;
 * returns null when billing isn't configured so the dashboard degrades to a
 * "billing not configured" state instead of crashing. `apiVersion` is omitted
 * so the SDK uses its pinned version.
 */

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) client = new Stripe(key);
  return client;
}

/** Billing is usable only when both the secret key and the Premium price are set. */
export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PREMIUM_PRICE_ID);
}
