import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@solari/database';

export const dynamic = 'force-dynamic';

/**
 * discordbotlist.com vote webhook. Register `https://<domain>/api/integrations/discordbotlist`
 * in the DBL "Webhooks" panel with an Authorization value matching
 * DBL_WEBHOOK_AUTH in .env. Fails closed (503) until that is set. Votes land in
 * the same store as top.gg, so /vote rewards them identically (per guild, once
 * per 12h). DBL doesn't signal weekend votes, so those aren't doubled.
 * Payload: https://docs.discordbotlist.com/vote-webhooks
 */
const voteSchema = z
  .object({
    // DBL sends the voter as `id`; accept a couple of aliases defensively so a
    // silent payload-shape change can't drop every vote on the floor.
    id: z.string().min(1).optional(),
    user: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    username: z.string().optional(),
    admin: z.boolean().optional(),
  })
  .transform((data) => ({ voterId: data.id ?? data.user ?? data.userId }));

/** Constant-time compare of the static Authorization token. */
function authorized(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.DBL_WEBHOOK_AUTH;
  if (!secret) {
    return NextResponse.json({ error: 'vote webhook not configured' }, { status: 503 });
  }
  if (!authorized(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = voteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !parsed.data.voterId) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 422 });
  }

  await prisma.topggVote.create({
    data: { userId: parsed.data.voterId, isWeekend: false },
  });
  return NextResponse.json({ ok: true });
}
