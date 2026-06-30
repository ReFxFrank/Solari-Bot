import { NextResponse } from 'next/server';
import { REFX_WEBHOOK_EVENTS, refxWebhookSchema, type RefxAlertData } from '@helios/shared';
import { claimDelivery, releaseDelivery, verifyRefxSignature } from '../../../../lib/refx-webhook';
import { fanOutRefxEvent } from '../../../../lib/refx-fanout';

// node:crypto + exact raw bytes require the Node runtime, not Edge.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 65_536;

/**
 * Inbound ReFx status/incident webhook. Fails CLOSED when unconfigured and
 * verifies an HMAC-SHA256 signature before doing any work. Status matrix:
 *   503 secret unset / Redis down · 413 oversize · 400 missing header or
 *   unknown event · 401 bad signature · 200 {deduped} replay · 422 invalid
 *   body / event mismatch · 200 {fannedOut} accepted.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.REFX_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'webhook not configured' }, { status: 503 });
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  }

  const signature = request.headers.get('x-refx-signature');
  const eventHeader = request.headers.get('x-refx-event');
  const delivery = request.headers.get('x-refx-delivery');
  if (!signature || !eventHeader || !delivery) {
    return NextResponse.json({ error: 'missing headers' }, { status: 400 });
  }
  if (!(REFX_WEBHOOK_EVENTS as readonly string[]).includes(eventHeader)) {
    return NextResponse.json({ error: 'unknown event' }, { status: 400 });
  }
  if (!verifyRefxSignature(secret, rawBody, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  // Claim AFTER verifying so a forged delivery id can't poison the dedupe set.
  let claimed: boolean;
  try {
    claimed = await claimDelivery(delivery);
  } catch {
    return NextResponse.json({ error: 'temporarily unavailable' }, { status: 503 });
  }
  if (!claimed) {
    return NextResponse.json({ ok: true, deduped: true }, { status: 200 });
  }

  let parsed: ReturnType<typeof refxWebhookSchema.parse>;
  try {
    parsed = refxWebhookSchema.parse(JSON.parse(rawBody));
  } catch {
    await releaseDelivery(delivery).catch(() => undefined);
    return NextResponse.json({ error: 'invalid body' }, { status: 422 });
  }
  if (parsed.event !== eventHeader) {
    await releaseDelivery(delivery).catch(() => undefined);
    return NextResponse.json({ error: 'event mismatch' }, { status: 422 });
  }

  let fannedOut = 0;
  try {
    fannedOut = await fanOutRefxEvent(parsed.event, {
      timestamp: parsed.timestamp,
      data: parsed.data as RefxAlertData,
    });
  } catch {
    // We accepted the delivery; downstream fan-out is best-effort. Never 5xx
    // here — that would make the provider retry something we already took.
  }
  return NextResponse.json({ ok: true, fannedOut }, { status: 200 });
}
