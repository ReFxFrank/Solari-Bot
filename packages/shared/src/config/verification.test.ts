import { describe, expect, it } from 'vitest';
import { verificationConfigSchema, verificationGateError } from './verification';

describe('verificationConfigSchema', () => {
  it('fills sensible defaults', () => {
    const config = verificationConfigSchema.parse({});
    expect(config.method).toBe('button');
    expect(config.buttonLabel).toBe('Verify');
    expect(config.verifiedRoleId).toBe('');
    expect(config.captchaLength).toBe(5);
    expect(config.maxAttempts).toBe(3);
    expect(config.failAction).toBe('none');
    expect(config.logChannelId).toBeNull();
  });

  it('accepts a legacy automod verification blob (compatible field names)', () => {
    const config = verificationConfigSchema.parse({
      enabled: true, // legacy key — stripped, module enable is separate now
      verifiedRoleId: '123',
      unverifiedRoleId: '456',
      buttonLabel: 'Let me in',
      panelTitle: 'Gate',
      panelMessage: 'Prove it',
      successMessage: 'Welcome',
    });
    expect(config.verifiedRoleId).toBe('123');
    expect(config.unverifiedRoleId).toBe('456');
    expect(config.buttonLabel).toBe('Let me in');
    expect('enabled' in config).toBe(false);
  });

  it('bounds captcha settings', () => {
    expect(() => verificationConfigSchema.parse({ captchaLength: 3 })).toThrow();
    expect(() => verificationConfigSchema.parse({ captchaLength: 9 })).toThrow();
    expect(() => verificationConfigSchema.parse({ maxAttempts: 0 })).toThrow();
    expect(() => verificationConfigSchema.parse({ failAction: 'ban' })).toThrow();
  });
});

describe('verificationGateError', () => {
  const HOUR = 3_600_000;
  const MINUTE = 60_000;
  const now = 1_000 * HOUR; // arbitrary fixed "now"

  it('passes when both gates are disabled', () => {
    const gates = { minAccountAgeHours: 0, minServerAgeMinutes: 0 };
    expect(verificationGateError(gates, now, now, now)).toBeNull();
  });

  it('blocks accounts younger than the floor and mentions the wait', () => {
    const gates = { minAccountAgeHours: 24, minServerAgeMinutes: 0 };
    const created = now - 20 * HOUR; // 4h short
    const error = verificationGateError(gates, created, now, now);
    expect(error).toMatch(/too new/);
    expect(error).toMatch(/4h 00m/);
    // Old enough → passes.
    expect(verificationGateError(gates, now - 25 * HOUR, now, now)).toBeNull();
  });

  it('blocks members who joined too recently', () => {
    const gates = { minAccountAgeHours: 0, minServerAgeMinutes: 10 };
    const joined = now - 3 * MINUTE; // 7m short
    const error = verificationGateError(gates, now - 100 * HOUR, joined, now);
    expect(error).toMatch(/joined too recently/);
    expect(error).toMatch(/7m/);
    expect(verificationGateError(gates, now - 100 * HOUR, now - 11 * MINUTE, now)).toBeNull();
  });

  it('fails CLOSED when the join time is unknown and the membership gate is on', () => {
    const gates = { minAccountAgeHours: 0, minServerAgeMinutes: 10 };
    expect(verificationGateError(gates, now - 100 * HOUR, null, now)).toMatch(/can’t confirm/);
    // ...but an unknown join time is fine when that gate is off.
    expect(
      verificationGateError({ ...gates, minServerAgeMinutes: 0 }, now - 100 * HOUR, null, now),
    ).toBeNull();
  });

  it('checks the account gate before the membership gate', () => {
    const gates = { minAccountAgeHours: 24, minServerAgeMinutes: 10 };
    const error = verificationGateError(gates, now - HOUR, now, now);
    expect(error).toMatch(/too new/);
  });
});
