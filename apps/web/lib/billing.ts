'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@solari/database';
import { assertCanManage, requireSession } from './auth-guards';
import { canManageBilling } from './billing-access';
import { getStripe } from './stripe';

function baseUrl(): string {
  return process.env.AUTH_URL ?? 'http://localhost:3000';
}

export type PremiumPlan = 'monthly' | 'yearly' | 'lifetime';

/** Resolve a plan to its Stripe price + checkout mode. Lifetime is one-time. */
function planConfig(plan: PremiumPlan): { priceId: string | undefined; oneTime: boolean } {
  switch (plan) {
    case 'yearly':
      return { priceId: process.env.STRIPE_YEARLY_PRICE_ID, oneTime: false };
    case 'lifetime':
      return { priceId: process.env.STRIPE_LIFETIME_PRICE_ID, oneTime: true };
    default:
      return { priceId: process.env.STRIPE_PREMIUM_PRICE_ID, oneTime: false };
  }
}

/**
 * Start a per-server Premium checkout for the chosen plan. Verifies the caller
 * can manage the guild, reuses (or creates) that guild's Stripe customer, and
 * redirects to Stripe Checkout. Monthly/Yearly use subscription mode; Lifetime
 * uses one-time payment mode. The guildId/userId ride in metadata (on the
 * subscription and the session/payment) so the webhook can map it back.
 */
export async function startCheckout(
  guildId: string,
  plan: PremiumPlan = 'monthly',
): Promise<void> {
  const session = await requireSession();
  await assertCanManage(session, guildId);

  const stripe = getStripe();
  const { priceId, oneTime } = planConfig(plan);
  if (!stripe || !priceId) throw new Error('That plan is not available.');

  const existing = await prisma.guildSubscription.findUnique({ where: { guildId } });
  let customerId = existing?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ metadata: { guildId } });
    customerId = customer.id;
  }
  // Record who is purchasing — billing visibility is scoped to them.
  await prisma.guildSubscription.upsert({
    where: { guildId },
    update: { stripeCustomerId: customerId, purchasedBy: session.user.id },
    create: { guildId, stripeCustomerId: customerId, purchasedBy: session.user.id },
  });

  const metadata = { guildId, userId: session.user.id, plan };
  const checkout = await stripe.checkout.sessions.create({
    mode: oneTime ? 'payment' : 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata,
    allow_promotion_codes: true,
    ...(oneTime
      ? { payment_intent_data: { metadata } }
      : { subscription_data: { metadata } }),
    success_url: `${baseUrl()}/servers/${guildId}/premium?upgraded=1`,
    cancel_url: `${baseUrl()}/servers/${guildId}/premium`,
  });
  if (!checkout.url) throw new Error('Could not start checkout.');
  redirect(checkout.url);
}

/** Open the Stripe billing portal — restricted to the purchaser (or bot owner). */
export async function openBillingPortal(guildId: string): Promise<void> {
  const session = await requireSession();
  await assertCanManage(session, guildId);

  const stripe = getStripe();
  if (!stripe) throw new Error('Billing is not configured.');

  const sub = await prisma.guildSubscription.findUnique({ where: { guildId } });
  if (!sub?.stripeCustomerId) throw new Error('No billing account for this server yet.');
  if (!canManageBilling(session, sub.purchasedBy)) {
    throw new Error('Only the member who purchased Premium can manage billing.');
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${baseUrl()}/servers/${guildId}/premium`,
  });
  redirect(portal.url);
}
