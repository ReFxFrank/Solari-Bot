import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { readRawBodyCapped, verifyRefxSignature } from './refx-webhook';

const SECRET = 'a-test-secret-at-least-16-chars';
const BODY = JSON.stringify({ event: 'incident.created', timestamp: 't', data: { id: 'i' } });

function sign(secret: string, body: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

describe('verifyRefxSignature', () => {
  it('accepts a correct signature', () => {
    expect(verifyRefxSignature(SECRET, BODY, sign(SECRET, BODY))).toBe(true);
  });

  it('rejects a wrong secret and a tampered body', () => {
    expect(verifyRefxSignature(SECRET, BODY, sign('other-secret-16char', BODY))).toBe(false);
    expect(verifyRefxSignature(SECRET, BODY + ' ', sign(SECRET, BODY))).toBe(false);
  });

  it('rejects missing / malformed / wrong-length signatures without throwing', () => {
    expect(verifyRefxSignature(SECRET, BODY, null)).toBe(false);
    expect(verifyRefxSignature(SECRET, BODY, 'deadbeef')).toBe(false); // no sha256= prefix
    expect(verifyRefxSignature(SECRET, BODY, 'sha256=nothex!!')).toBe(false);
    expect(verifyRefxSignature(SECRET, BODY, 'sha256=abc')).toBe(false); // odd length
    expect(verifyRefxSignature(SECRET, BODY, 'sha256=dead')).toBe(false); // valid hex, wrong length
  });
});

describe('readRawBodyCapped', () => {
  it('returns the body when under the cap', async () => {
    const request = new Request('http://x', { method: 'POST', body: 'hello world' });
    expect(await readRawBodyCapped(request, 1000)).toBe('hello world');
  });

  it('returns null once the streamed total exceeds the cap', async () => {
    const request = new Request('http://x', { method: 'POST', body: 'x'.repeat(5000) });
    expect(await readRawBodyCapped(request, 128)).toBeNull();
  });
});
