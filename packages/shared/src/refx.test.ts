import { describe, expect, it } from 'vitest';
import { buildRefxAlert, refxStatusEmoji, refxWebhookSchema } from './refx';

describe('refxStatusEmoji', () => {
  it('maps status strings to traffic lights', () => {
    expect(refxStatusEmoji('operational')).toBe('🟢');
    expect(refxStatusEmoji('maintenance')).toBe('🔵');
    expect(refxStatusEmoji('degraded_performance')).toBe('🟡');
    expect(refxStatusEmoji('major_outage')).toBe('🔴');
  });

  it('covers the ReFx status vocabulary (operational|degraded|maintenance|outage)', () => {
    expect(refxStatusEmoji('operational')).toBe('🟢');
    expect(refxStatusEmoji('degraded')).toBe('🟡');
    expect(refxStatusEmoji('maintenance')).toBe('🔵');
    expect(refxStatusEmoji('outage')).toBe('🔴');
  });
});

describe('refxWebhookSchema', () => {
  it('accepts each valid event and preserves passthrough fields', () => {
    const incident = refxWebhookSchema.parse({
      event: 'incident.created',
      timestamp: '2026-06-30T00:00:00Z',
      data: { id: 'i1', title: 'DB down', severity: 'major', extra: 'kept' },
    });
    expect(incident.event).toBe('incident.created');
    expect((incident.data as Record<string, unknown>).extra).toBe('kept');

    const component = refxWebhookSchema.parse({
      event: 'component.status_changed',
      timestamp: '2026-06-30T00:00:00Z',
      data: { key: 'nodes', name: 'Nodes', status: 'degraded' },
    });
    expect(component.event).toBe('component.status_changed');
  });

  it('rejects unknown events, missing timestamp, and non-object data', () => {
    expect(
      refxWebhookSchema.safeParse({ event: 'nope', timestamp: 'x', data: { id: 'i' } }).success,
    ).toBe(false);
    expect(
      refxWebhookSchema.safeParse({ event: 'incident.created', data: { id: 'i' } }).success,
    ).toBe(false);
    expect(
      refxWebhookSchema.safeParse({ event: 'incident.created', timestamp: 'x', data: 'nope' })
        .success,
    ).toBe(false);
  });

  it('parses fail-open data so a signed event is never dropped on a renamed/omitted field', () => {
    expect(
      refxWebhookSchema.parse({ event: 'incident.created', timestamp: 't', data: {} }).event,
    ).toBe('incident.created');
    expect(
      refxWebhookSchema.parse({ event: 'component.status_changed', timestamp: 't', data: {} })
        .event,
    ).toBe('component.status_changed');
    // a malformed url is dropped, not fatal
    const parsed = refxWebhookSchema.parse({
      event: 'incident.created',
      timestamp: 't',
      data: { id: 'i', url: 'not a url' },
    });
    expect((parsed.data as Record<string, unknown>).url).toBeUndefined();
  });
});

describe('buildRefxAlert', () => {
  it('renders each event kind', () => {
    expect(buildRefxAlert('incident.created', { title: 'X', severity: 'major' }).kind).toBe(
      'danger',
    );
    expect(buildRefxAlert('incident.resolved', { title: 'X' }).kind).toBe('success');
    expect(
      buildRefxAlert('component.status_changed', { name: 'Nodes', status: 'operational' }).kind,
    ).toBe('success');
    expect(
      buildRefxAlert('component.status_changed', { name: 'Nodes', status: 'major_outage' }).kind,
    ).toBe('warning');
  });
});
