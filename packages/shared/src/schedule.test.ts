import { describe, expect, it } from 'vitest';
import { computeNextRun, scheduledMessageInputSchema } from './schedule';

describe('computeNextRun', () => {
  it('returns null for a one-off', () => {
    expect(computeNextRun(new Date('2026-06-30T12:00:00Z'), 'NONE', new Date())).toBeNull();
  });

  it('returns the base unchanged when it is still in the future', () => {
    const base = new Date('2026-06-30T12:00:00Z');
    const now = new Date('2026-06-30T11:00:00Z');
    expect(computeNextRun(base, 'DAILY', now)?.toISOString()).toBe('2026-06-30T12:00:00.000Z');
  });

  it('advances one interval when the base just fired', () => {
    const base = new Date('2026-06-30T12:00:00Z');
    const now = new Date('2026-06-30T12:00:00Z'); // fired exactly now
    expect(computeNextRun(base, 'DAILY', now)?.toISOString()).toBe('2026-07-01T12:00:00.000Z');
  });

  it('jumps past every missed occurrence in one step (no catch-up storm)', () => {
    const base = new Date('2026-06-01T12:00:00Z');
    const now = new Date('2026-06-30T13:00:00Z'); // 29 days + 1h later
    const next = computeNextRun(base, 'DAILY', now);
    // The very next daily slot strictly after `now`.
    expect(next?.toISOString()).toBe('2026-07-01T12:00:00.000Z');
  });

  it('steps hourly and weekly correctly', () => {
    const base = new Date('2026-06-30T12:00:00Z');
    expect(computeNextRun(base, 'HOURLY', new Date('2026-06-30T12:30:00Z'))?.toISOString()).toBe(
      '2026-06-30T13:00:00.000Z',
    );
    expect(computeNextRun(base, 'WEEKLY', new Date('2026-06-30T12:30:00Z'))?.toISOString()).toBe(
      '2026-07-07T12:00:00.000Z',
    );
  });
});

describe('scheduledMessageInputSchema', () => {
  it('accepts a valid payload and defaults repeat to NONE', () => {
    const parsed = scheduledMessageInputSchema.parse({
      channelId: '123456789012345678',
      content: 'gm',
      firstRunAt: '2026-07-01T09:00:00.000Z',
    });
    expect(parsed.repeat).toBe('NONE');
  });

  it('rejects a bad channel id and an empty message', () => {
    expect(
      scheduledMessageInputSchema.safeParse({
        channelId: 'nope',
        content: 'hi',
        firstRunAt: '2026-07-01T09:00:00.000Z',
      }).success,
    ).toBe(false);
    expect(
      scheduledMessageInputSchema.safeParse({
        channelId: '123456789012345678',
        content: '',
        firstRunAt: '2026-07-01T09:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});
