import { Check, Crown } from 'lucide-react';
import { prisma } from '@solari/database';
import { PREMIUM_PERKS, tierFromSubscription } from '@solari/shared';
import { guardGuildAccess } from '../../../../lib/auth-guards';
import { startCheckout, openBillingPortal } from '../../../../lib/billing';
import { canManageBilling } from '../../../../lib/billing-access';
import { isBillingConfigured } from '../../../../lib/stripe';
import { GlassCard } from '../../../../components/ui/glass-card';

export const dynamic = 'force-dynamic';

export default async function PremiumPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const { id } = await params;
  const { upgraded } = await searchParams;
  const { session } = await guardGuildAccess(id);

  const [sub, guild] = await Promise.all([
    prisma.guildSubscription.findUnique({ where: { guildId: id } }),
    prisma.guild.findUnique({ where: { id }, select: { premiumTier: true } }),
  ]);
  // Paid premium comes from a live Stripe subscription; granted premium is the
  // bot owner setting Guild.premiumTier from the admin panel (no sub row).
  // Granted servers get the active state with no billing surface at all.
  const paidPremium = tierFromSubscription(sub?.status, sub?.currentPeriodEnd ?? null) === 'PREMIUM';
  const isPremium = paidPremium || guild?.premiumTier === 'PREMIUM';
  const granted = isPremium && !paidPremium;
  const configured = isBillingConfigured();
  // Billing details are private to the purchaser (and the bot owner) — other
  // guild admins only see that Premium is active.
  const showBilling = paidPremium && canManageBilling(session, sub?.purchasedBy);

  const renews = sub?.currentPeriodEnd
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(sub.currentPeriodEnd)
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white/90">
          <Crown className="h-5 w-5 text-amber-300" /> Premium
        </h2>
        <p className="text-sm text-white/50">
          Unlock the premium modules and higher limits for this server.
        </p>
      </div>

      {upgraded && (
        <GlassCard className="border-[var(--color-success)]/30 p-4">
          <p className="text-sm text-[var(--color-success)]">
            Thanks for upgrading! Premium activates the moment Stripe confirms the payment.
          </p>
        </GlassCard>
      )}

      <GlassCard className="p-5">
        {isPremium ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
                <Crown className="h-3.5 w-3.5" /> Premium active
              </span>
              {sub?.cancelAtPeriodEnd && (
                <span className="text-xs text-white/50">Cancels at period end</span>
              )}
            </div>
            {granted ? (
              <p className="text-sm text-white/50">
                Premium is enabled for this server — every premium module is unlocked. Nothing to
                manage.
              </p>
            ) : showBilling ? (
              <>
                {renews && (
                  <p className="text-sm text-white/60">
                    {sub?.cancelAtPeriodEnd ? 'Access until' : 'Renews'} <strong>{renews}</strong>.
                  </p>
                )}
                <form action={openBillingPortal.bind(null, id)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/[0.06]"
                  >
                    Manage billing
                  </button>
                </form>
              </>
            ) : (
              <p className="text-sm text-white/50">
                Billing for this server is managed privately by the member who purchased Premium.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-2">
              {PREMIUM_PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm text-white/80">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                  {perk}
                </li>
              ))}
            </ul>
            {configured ? (
              <form action={startCheckout.bind(null, id)}>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-200"
                >
                  Upgrade to Premium
                </button>
              </form>
            ) : (
              <p className="text-sm text-white/40">
                Billing isn’t configured on this instance — set the <code>STRIPE_*</code> environment
                variables to enable upgrades.
              </p>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
