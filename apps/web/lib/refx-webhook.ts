import { createHmac, timingSafeEqual } from 'node:crypto';
import { getRedis } from './redis';

const HEX_RE = /^[0-9a-f]+$/i;
const deliveryKey = (id: string): string => `refx:webhook:${id}`;

/**
 * Read the request body, hard-capping memory at `maxBytes`. Streams the body
 * and aborts the moment the running total exceeds the cap, so a hostile client
 * can never make us buffer an unbounded payload (Content-Length is untrusted
 * and App Router applies no default body limit). Returns null when too large.
 */
export async function readRawBodyCapped(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  const stream = request.body;
  if (!stream) {
    const text = await request.text();
    return Buffer.byteLength(text, 'utf8') > maxBytes ? null : text;
  }
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Verify an `X-ReFx-Signature: sha256=<hex>` header against the raw request
 * body using a constant-time comparison. Returns false (never throws) for a
 * missing/malformed/wrong-length signature, so it can't be used as an oracle.
 */
export function verifyRefxSignature(
  secret: string,
  rawBody: string,
  header: string | null,
): boolean {
  if (!header || !header.startsWith('sha256=')) return false;
  const provided = header.slice('sha256='.length);
  if (!HEX_RE.test(provided) || provided.length % 2 !== 0) return false;
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Atomically claim a webhook delivery id (SET NX EX). Returns true if newly
 * claimed, false if this delivery was already processed within the TTL — the
 * idempotency guard for the provider's at-least-once retries.
 */
export async function claimDelivery(deliveryId: string, ttlSeconds = 86_400): Promise<boolean> {
  const result = await getRedis().set(deliveryKey(deliveryId), '1', 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

/** Release a claim so a corrected retry of a rejected delivery isn't swallowed. */
export async function releaseDelivery(deliveryId: string): Promise<void> {
  await getRedis().del(deliveryKey(deliveryId));
}
