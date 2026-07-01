import { prisma, type EconomyUser } from '@solari/database';
import type { EconomyConfig } from '@solari/shared';

/** Fetch (or lazily create) a member's economy row, seeded with the start balance. */
export async function getEconomyUser(
  guildId: string,
  userId: string,
  startingBalance = 0,
): Promise<EconomyUser> {
  return prisma.economyUser.upsert({
    where: { guildId_userId: { guildId, userId } },
    update: {},
    create: { guildId, userId, wallet: startingBalance },
  });
}

/** Atomically adjust a member's wallet (row must exist — call getEconomyUser first). */
export async function addWallet(guildId: string, userId: string, delta: number): Promise<void> {
  await prisma.economyUser.update({
    where: { guildId_userId: { guildId, userId } },
    data: { wallet: { increment: delta } },
  });
}

/**
 * Race-safe conditional debit: decrement only if the wallet still holds at least
 * `amount`. Returns true if the debit applied. Prevents a wallet going negative
 * when two spend commands run concurrently.
 */
export async function trySpendWallet(
  guildId: string,
  userId: string,
  amount: number,
): Promise<boolean> {
  const res = await prisma.economyUser.updateMany({
    where: { guildId, userId, wallet: { gte: amount } },
    data: { wallet: { decrement: amount } },
  });
  return res.count > 0;
}

/** Race-safe conditional debit from the bank. */
export async function trySpendBank(
  guildId: string,
  userId: string,
  amount: number,
): Promise<boolean> {
  const res = await prisma.economyUser.updateMany({
    where: { guildId, userId, bank: { gte: amount } },
    data: { bank: { decrement: amount } },
  });
  return res.count > 0;
}

/** Format an amount with the guild's currency symbol. */
export function formatMoney(amount: number, config: Pick<EconomyConfig, 'currencySymbol'>): string {
  return `**${amount.toLocaleString('en-US')}** ${config.currencySymbol}`;
}

/** Remaining cooldown in ms (0 if ready). */
export function cooldownRemaining(last: Date | null, seconds: number): number {
  if (!last) return 0;
  return Math.max(0, seconds * 1000 - (Date.now() - last.getTime()));
}

/** Human-readable duration, e.g. "1h 4m 12s". */
export function formatDuration(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

/**
 * Resolve and clamp a bet against the actor's wallet and the guild's max bet.
 * Returns the usable amount, or an error string.
 */
export function resolveBet(
  amount: number,
  wallet: number,
  maxBet: number,
): { ok: true; amount: number } | { ok: false; error: string } {
  if (!Number.isFinite(amount) || amount < 1) return { ok: false, error: 'Bet at least 1.' };
  if (amount > maxBet) return { ok: false, error: `The max bet is ${maxBet.toLocaleString('en-US')}.` };
  if (amount > wallet) return { ok: false, error: "You don't have that much in your wallet." };
  return { ok: true, amount };
}
