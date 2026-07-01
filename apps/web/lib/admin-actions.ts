'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@solari/database';
import { requireOwner } from './auth-guards';

export interface AdminActionResult {
  ok: boolean;
  error?: string;
}

/** Set (or clear) a guild's premium tier. Owner-only. */
export async function grantPremium(
  guildId: string,
  tier: 'FREE' | 'PREMIUM',
): Promise<AdminActionResult> {
  await requireOwner();
  try {
    await prisma.guild.upsert({
      where: { id: guildId },
      update: { premiumTier: tier },
      create: { id: guildId, premiumTier: tier },
    });
    revalidatePath('/admin');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not update premium tier.' };
  }
}

/** Add or update a blacklist entry for a guild or user. Owner-only. */
export async function addBlacklist(
  type: 'GUILD' | 'USER',
  targetId: string,
  reason: string | null,
): Promise<AdminActionResult> {
  await requireOwner();
  try {
    await prisma.blacklist.upsert({
      where: { type_targetId: { type, targetId } },
      update: { reason },
      create: { type, targetId, reason },
    });
    revalidatePath('/admin');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not add to blacklist.' };
  }
}

/** Remove a blacklist entry for a guild or user. Owner-only. */
export async function removeBlacklist(
  type: 'GUILD' | 'USER',
  targetId: string,
): Promise<AdminActionResult> {
  await requireOwner();
  try {
    await prisma.blacklist.deleteMany({ where: { type, targetId } });
    revalidatePath('/admin');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not remove from blacklist.' };
  }
}
