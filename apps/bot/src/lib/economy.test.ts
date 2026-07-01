import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@solari/database';
import {
  cooldownRemaining,
  formatMoney,
  getEconomyUser,
  resolveBet,
  settleBet,
  tryClaimDaily,
  tryStampRob,
  tryTransferWallet,
} from './economy';

// ── Pure helpers (always run) ────────────────────────────────────────────────

describe('resolveBet', () => {
  it('rejects bets below the minimum', () => {
    const result = resolveBet(5, 1000, 10_000, 10);
    expect(result.ok).toBe(false);
  });

  it('rejects bets above the max bet', () => {
    const result = resolveBet(20_000, 100_000, 10_000);
    expect(result.ok).toBe(false);
  });

  it('rejects bets above the wallet', () => {
    const result = resolveBet(500, 100, 10_000);
    expect(result.ok).toBe(false);
  });

  it('rejects NaN/infinite bets', () => {
    expect(resolveBet(Number.NaN, 1000, 10_000).ok).toBe(false);
    expect(resolveBet(Number.POSITIVE_INFINITY, 1000, 10_000).ok).toBe(false);
  });

  it('accepts a valid bet and echoes the amount', () => {
    const result = resolveBet(250, 1000, 10_000);
    expect(result).toEqual({ ok: true, amount: 250 });
  });
});

describe('formatMoney / cooldownRemaining', () => {
  it('formats with separators and the guild symbol', () => {
    expect(formatMoney(1_234_567, { currencySymbol: '🪙' })).toBe('**1,234,567** 🪙');
  });

  it('reports zero cooldown when never used or expired, remaining otherwise', () => {
    expect(cooldownRemaining(null, 3600)).toBe(0);
    expect(cooldownRemaining(new Date(Date.now() - 7200_000), 3600)).toBe(0);
    const remaining = cooldownRemaining(new Date(Date.now() - 1800_000), 3600);
    expect(remaining).toBeGreaterThan(1700_000);
    expect(remaining).toBeLessThanOrEqual(1800_000);
  });
});

// ── Atomic balance helpers (integration — self-skips without Postgres) ───────

const GUILD = `eco-test-${process.pid}`;

async function dbUp(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function freshUser(userId: string, wallet: number): Promise<string> {
  await prisma.guild.upsert({ where: { id: GUILD }, update: {}, create: { id: GUILD } });
  await prisma.economyUser.upsert({
    where: { guildId_userId: { guildId: GUILD, userId } },
    update: { wallet, lastDaily: null, lastRob: null },
    create: { guildId: GUILD, userId, wallet },
  });
  return userId;
}

async function walletOf(userId: string): Promise<number> {
  const row = await prisma.economyUser.findUnique({
    where: { guildId_userId: { guildId: GUILD, userId } },
  });
  return row?.wallet ?? -1;
}

afterAll(async () => {
  if (await dbUp()) {
    await prisma.economyUser.deleteMany({ where: { guildId: GUILD } });
    await prisma.guild.deleteMany({ where: { id: GUILD } });
  }
  await prisma.$disconnect().catch(() => undefined);
});

describe('settleBet (integration)', () => {
  it('refuses a bet larger than the wallet and leaves it untouched', async (ctx) => {
    if (!(await dbUp())) return ctx.skip();
    const user = await freshUser('u-settle-1', 100);
    expect(await settleBet(GUILD, user, 150, 300)).toBe(false);
    expect(await walletOf(user)).toBe(100);
  });

  it('debits the stake and credits the payout atomically', async (ctx) => {
    if (!(await dbUp())) return ctx.skip();
    const user = await freshUser('u-settle-2', 100);
    expect(await settleBet(GUILD, user, 50, 100)).toBe(true); // net +50
    expect(await walletOf(user)).toBe(150);
    expect(await settleBet(GUILD, user, 50, 0)).toBe(true); // lost
    expect(await walletOf(user)).toBe(100);
  });
});

describe('tryTransferWallet (integration)', () => {
  it('moves money both-or-nothing', async (ctx) => {
    if (!(await dbUp())) return ctx.skip();
    const from = await freshUser('u-from', 200);
    const to = await freshUser('u-to', 10);
    expect(await tryTransferWallet(GUILD, from, to, 500)).toBe(false);
    expect(await walletOf(from)).toBe(200);
    expect(await walletOf(to)).toBe(10);
    expect(await tryTransferWallet(GUILD, from, to, 150)).toBe(true);
    expect(await walletOf(from)).toBe(50);
    expect(await walletOf(to)).toBe(160);
  });
});

describe('cooldown gates (integration)', () => {
  it('tryClaimDaily grants once per window', async (ctx) => {
    if (!(await dbUp())) return ctx.skip();
    const user = await freshUser('u-daily', 0);
    expect(await tryClaimDaily(GUILD, user, 250, 86_400)).toBe(true);
    expect(await walletOf(user)).toBe(250);
    expect(await tryClaimDaily(GUILD, user, 250, 86_400)).toBe(false);
    expect(await walletOf(user)).toBe(250);
  });

  it('tryStampRob allows one attempt per cooldown', async (ctx) => {
    if (!(await dbUp())) return ctx.skip();
    const user = await freshUser('u-rob', 0);
    expect(await tryStampRob(GUILD, user, 3600)).toBe(true);
    expect(await tryStampRob(GUILD, user, 3600)).toBe(false);
  });

  it('getEconomyUser seeds the starting balance exactly once', async (ctx) => {
    if (!(await dbUp())) return ctx.skip();
    const first = await getEconomyUser(GUILD, 'u-seed', 500);
    expect(first.wallet).toBe(500);
    await prisma.economyUser.update({
      where: { guildId_userId: { guildId: GUILD, userId: 'u-seed' } },
      data: { wallet: 42 },
    });
    const again = await getEconomyUser(GUILD, 'u-seed', 500);
    expect(again.wallet).toBe(42); // upsert must not re-seed
  });
});
