import { describe, expect, it } from 'vitest';
import { isModuleLocked, tierFromSubscription } from './premium';

describe('isModuleLocked', () => {
  it('locks premium modules for FREE and unlocks for PREMIUM', () => {
    expect(isModuleLocked('MUSIC', 'FREE')).toBe(true);
    expect(isModuleLocked('ECONOMY', 'FREE')).toBe(true);
    expect(isModuleLocked('MUSIC', 'PREMIUM')).toBe(false);
  });

  it('never locks non-premium (core) modules', () => {
    expect(isModuleLocked('MODERATION', 'FREE')).toBe(false);
    expect(isModuleLocked('LEVELING', 'FREE')).toBe(false);
  });
});

describe('tierFromSubscription', () => {
  const now = 1_000_000_000_000;
  const future = new Date(now + 86_400_000);
  const past = new Date(now - 1);

  it('grants PREMIUM for active/trialing with a future period end', () => {
    expect(tierFromSubscription('active', future, now)).toBe('PREMIUM');
    expect(tierFromSubscription('trialing', future, now)).toBe('PREMIUM');
    expect(tierFromSubscription('active', null, now)).toBe('PREMIUM');
  });

  it('is FREE for inactive/missing status', () => {
    expect(tierFromSubscription('past_due', future, now)).toBe('FREE');
    expect(tierFromSubscription('canceled', future, now)).toBe('FREE');
    expect(tierFromSubscription(null, future, now)).toBe('FREE');
    expect(tierFromSubscription(undefined, null, now)).toBe('FREE');
  });

  it('falls back to FREE if the period already lapsed (missed webhook)', () => {
    expect(tierFromSubscription('active', past, now)).toBe('FREE');
  });
});
