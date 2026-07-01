import type { Session } from 'next-auth';
import { isOwner } from './auth-guards';

/**
 * Billing details (renewal date, Stripe portal, invoices) are private to the
 * member who purchased the subscription — not to every guild admin. The bot
 * owner is also allowed (support, plus legacy subscriptions from before
 * `purchasedBy` existed, where the field is null and would otherwise lock
 * everyone out).
 */
export function canManageBilling(
  session: Session,
  purchasedBy: string | null | undefined,
): boolean {
  const userId = session.user?.id;
  if (!userId) return false;
  if (isOwner(session)) return true;
  return Boolean(purchasedBy) && purchasedBy === userId;
}
