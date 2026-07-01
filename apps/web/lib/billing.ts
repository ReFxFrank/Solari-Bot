'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@solari/database';
import { assertCanManage, requireSession } from './auth-guards';
import { getStripe } from './stripe';

function baseUrl(): string {
  return process.env.AUTH_URL ?? 'http://localhost:3000';
}

/**
 * Start a per-server Premium checkout. Verifies the caller can manage the guild,
 * reuses (or creates) that guild's Stripe customer, and redirects to Stripe
 * Checkout. The subscription carries `metadata.guildId` so the webhook can map
 * it back to the server.
 */
export async function startCheckout(guildId: string): Promise<void> {
  const session = await requireSession();
  await assertCanManage(session, guildId);

  const stripe = getStripe();
  const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!stripe || !priceId) throw new Error('Billing is not configured.');

  const existing = await prisma.guildSubscription.findUnique({ where: { guildId } });
  let customerId = existing?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ metadata: { guildId } });
    customerId = customer.id;
    await prisma.guildSubscription.upsert({
      where: { guildId },
      update: { stripeCustomerId: customerId },
      create: { guildId, stripeCustomerId: customerId },
    });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { guildId } },
    metadata: { guildId },
    allow_promotion_codes: true,
    success_url: `${baseUrl()}/servers/${guildId}/premium?upgraded=1`,
    cancel_url: `${baseUrl()}/servers/${guildId}/premium`,
  });
  if (!checkout.url) throw new Error('Could not start checkout.');
  redirect(checkout.url);
}

/** Open the Stripe billing portal so the guild's manager can update or cancel. */
export async function openBillingPortal(guildId: string): Promise<void> {
  const session = await requireSession();
  await assertCanManage(session, guildId);

  const stripe = getStripe();
  if (!stripe) throw new Error('Billing is not configured.');

  const sub = await prisma.guildSubscription.findUnique({ where: { guildId } });
  if (!sub?.stripeCustomerId) throw new Error('No billing account for this server yet.');

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${baseUrl()}/servers/${guildId}/premium`,
  });
  redirect(portal.url);
}
