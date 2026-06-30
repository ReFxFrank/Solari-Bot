import { describe, expect, it } from 'vitest';
import { ticketsConfigSchema } from './tickets';

describe('ticketsConfigSchema', () => {
  it('fills sensible defaults from an empty object', () => {
    const config = ticketsConfigSchema.parse({});
    expect(config.categoryId).toBeNull();
    expect(config.supportRoleIds).toEqual([]);
    expect(config.maxOpenPerUser).toBe(1);
    expect(config.autoCloseHours).toBe(0);
    expect(config.buttonLabel.length).toBeGreaterThan(0);
  });

  it('accepts a full config', () => {
    const config = ticketsConfigSchema.parse({
      categoryId: '123456789012345678',
      supportRoleIds: ['111', '222'],
      transcriptChannelId: '333',
      panelChannelId: '444',
      maxOpenPerUser: 3,
      autoCloseHours: 48,
      buttonLabel: 'Get help',
    });
    expect(config.supportRoleIds).toHaveLength(2);
    expect(config.maxOpenPerUser).toBe(3);
    expect(config.autoCloseHours).toBe(48);
  });

  it('rejects out-of-range numeric fields', () => {
    expect(ticketsConfigSchema.safeParse({ maxOpenPerUser: 0 }).success).toBe(false);
    expect(ticketsConfigSchema.safeParse({ maxOpenPerUser: 99 }).success).toBe(false);
    expect(ticketsConfigSchema.safeParse({ autoCloseHours: -1 }).success).toBe(false);
    expect(ticketsConfigSchema.safeParse({ autoCloseHours: 9999 }).success).toBe(false);
  });
});
