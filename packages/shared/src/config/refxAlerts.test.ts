import { describe, expect, it } from 'vitest';
import { refxAlertMatches, refxAlertShouldMention, refxAlertsConfigSchema } from './refxAlerts';

const base = refxAlertsConfigSchema.parse({});

describe('refxAlertsConfigSchema', () => {
  it('defaults to all events, no filters', () => {
    expect(base.channelId).toBeNull();
    expect(base.events).toHaveLength(4);
    expect(base.regionFilter).toEqual([]);
    expect(base.minSeverity).toBeNull();
  });
});

describe('refxAlertMatches', () => {
  it('rejects events not in the subscription', () => {
    const config = refxAlertsConfigSchema.parse({ events: ['incident.created'] });
    expect(refxAlertMatches(config, 'incident.created', { id: 'i' })).toBe(true);
    expect(refxAlertMatches(config, 'incident.resolved', { id: 'i' })).toBe(false);
  });

  it('applies a region filter but fails open when regionCode is absent', () => {
    const config = refxAlertsConfigSchema.parse({ regionFilter: ['ca-east'] });
    expect(refxAlertMatches(config, 'incident.created', { id: 'i', regionCode: 'ca-east' })).toBe(
      true,
    );
    expect(refxAlertMatches(config, 'incident.created', { id: 'i', regionCode: 'eu-west' })).toBe(
      false,
    );
    // missing regionCode => matches (fail open)
    expect(refxAlertMatches(config, 'incident.created', { id: 'i' })).toBe(true);
  });

  it('matches region filters case-insensitively', () => {
    const config = refxAlertsConfigSchema.parse({ regionFilter: ['CA-East'] });
    expect(refxAlertMatches(config, 'incident.created', { id: 'i', regionCode: 'ca-east' })).toBe(
      true,
    );
  });

  it('respects a minimum severity floor and fails open when severity is absent', () => {
    const config = refxAlertsConfigSchema.parse({ minSeverity: 'major' });
    expect(refxAlertMatches(config, 'incident.created', { id: 'i', severity: 'critical' })).toBe(
      true,
    );
    expect(refxAlertMatches(config, 'incident.created', { id: 'i', severity: 'major' })).toBe(true);
    expect(refxAlertMatches(config, 'incident.created', { id: 'i', severity: 'minor' })).toBe(
      false,
    );
    expect(refxAlertMatches(config, 'incident.created', { id: 'i', severity: 'maintenance' })).toBe(
      false,
    );
    // missing severity => fail open
    expect(refxAlertMatches(config, 'incident.created', { id: 'i' })).toBe(true);
    // unknown/renamed severity => fail open (ranks at top), never dropped
    expect(refxAlertMatches(config, 'incident.created', { id: 'i', severity: 'emergency' })).toBe(
      true,
    );
  });
});

describe('refxAlertShouldMention', () => {
  it('only mentions when a role is set and severity qualifies', () => {
    expect(refxAlertShouldMention(base, { id: 'i' })).toBe(false); // no role
    const always = refxAlertsConfigSchema.parse({ mentionRoleId: '1' });
    expect(refxAlertShouldMention(always, { id: 'i' })).toBe(true);
    const gated = refxAlertsConfigSchema.parse({
      mentionRoleId: '1',
      mentionMinSeverity: 'critical',
    });
    expect(refxAlertShouldMention(gated, { id: 'i', severity: 'critical' })).toBe(true);
    expect(refxAlertShouldMention(gated, { id: 'i', severity: 'minor' })).toBe(false);
    expect(refxAlertShouldMention(gated, { id: 'i' })).toBe(true); // fail open
  });
});
