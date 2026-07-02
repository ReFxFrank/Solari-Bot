import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { prisma } from '@solari/database';
import { LIFETIME_STATUS, tierFromSubscription } from '@solari/shared';
import { getStripe } from '../../../../lib/stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Stripe webhook (§3). Verifies the signature, then mirrors the subscription's
 * state into GuildSubscription and flips the fast `Guild.premiumTier` flag the
 * bot reads. Returns 5xx on handler failure so Stripe retries; 503 when billing
 * isn't configured; 400 on a bad/missing signature.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'billing not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'missing signature' }, { status: 400 });

  const body = await request.text(); // raw body is required for signature verification
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret);
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (typeof session.subscription === 'string') {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscription(sub);
        } else if (session.mode === 'payment' && session.payment_status === 'paid') {
          // One-time Lifetime purchase — no subscription to track.
          await grantLifetime(session);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncSubscription(event.data.object);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handling failed', err);
    return NextResponse.json({ error: 'handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** Grant permanent Premium for a paid one-time (Lifetime) checkout session. */
async function grantLifetime(session: Stripe.Checkout.Session): Promise<void> {
  const guildId = session.metadata?.guildId;
  if (!guildId || session.metadata?.plan !== 'lifetime') return;

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const purchasedBy = session.metadata?.userId || undefined;

  // premiumTier is the fast flag the bot reads; the sub row records it as a
  // lifetime purchase (status 'lifetime', no period end) so it never expires.
  await prisma.guild.upsert({
    where: { id: guildId },
    update: { premiumTier: 'PREMIUM' },
    create: { id: guildId, premiumTier: 'PREMIUM' },
  });
  await prisma.guildSubscription.upsert({
    where: { guildId },
    update: {
      status: LIFETIME_STATUS,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      stripePriceId: process.env.STRIPE_LIFETIME_PRICE_ID ?? null,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      ...(purchasedBy ? { purchasedBy } : {}),
    },
    create: {
      guildId,
      status: LIFETIME_STATUS,
      stripeCustomerId: customerId ?? null,
      stripePriceId: process.env.STRIPE_LIFETIME_PRICE_ID ?? null,
      purchasedBy,
    },
  });
}

async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const guildId = sub.metadata?.guildId;
  if (!guildId) return;

  // In the 2025 API the billing period lives on the subscription item.
  const item = sub.items.data[0];
  const currentPeriodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

  // Who purchased (checkout stamps it in metadata). Only ever set — never
  // cleared — so a metadata-less event can't wipe billing ownership.
  const purchasedBy = sub.metadata?.userId || undefined;

  const fields = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    stripePriceId: item?.price.id ?? null,
    status: sub.status,
    currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    ...(purchasedBy ? { purchasedBy } : {}),
  };

  // Ensure the guild row exists first — GuildSubscription FKs to it, and a
  // webhook can arrive before the bot has registered the guild.
  const tier = tierFromSubscription(sub.status, currentPeriodEnd);
  await prisma.guild.upsert({
    where: { id: guildId },
    update: { premiumTier: tier },
    create: { id: guildId, premiumTier: tier },
  });

  await prisma.guildSubscription.upsert({
    where: { guildId },
    update: fields,
    create: { guildId, ...fields },
  });
}
