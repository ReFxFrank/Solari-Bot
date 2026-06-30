import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyRefxSignature } from './refx-webhook';

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
