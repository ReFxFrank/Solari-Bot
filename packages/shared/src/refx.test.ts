import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildRefxAlert,
  fetchRefxNodes,
  formatUptime,
  nodeMetricsLine,
  refxNodesSchema,
  refxStatusEmoji,
  refxStatusSchema,
  refxWebhookSchema,
} from './refx';

// A real sample from GET https://api.refx.gg/api/v1/status.
const sample = {
  success: true,
  data: {
    status: 'operational',
    updatedAt: '2026-06-30T17:32:50.707Z',
    components: [
      { key: 'panel-api', name: 'Control Panel API', status: 'operational' },
      { key: 'nodes', name: 'Game Server Nodes', status: 'operational' },
    ],
    regions: [
      {
        code: 'ca-east',
        name: 'CA east',
        country: 'CA',
        status: 'operational',
        nodesUp: 2,
        nodesTotal: 2,
        nodes: [
          { name: 'refx-ca-east-bhs', status: 'operational' },
          { name: 'refx-ca-east-bhs1', status: 'operational' },
        ],
      },
    ],
    incidents: { active: [], recent: [] },
  },
};

describe('refxStatusSchema', () => {
  it('parses the live status payload', () => {
    const parsed = refxStatusSchema.parse(sample);
    expect(parsed.data.status).toBe('operational');
    expect(parsed.data.regions[0]?.nodesUp).toBe(2);
    expect(parsed.data.regions[0]?.nodes).toHaveLength(2);
  });

  it('fills defaults for a minimal payload', () => {
    const parsed = refxStatusSchema.parse({ data: { status: 'operational' } });
    expect(parsed.data.components).toEqual([]);
    expect(parsed.data.incidents.active).toEqual([]);
  });
});

describe('refxStatusEmoji', () => {
  it('maps status strings to traffic lights', () => {
    expect(refxStatusEmoji('operational')).toBe('🟢');
    expect(refxStatusEmoji('maintenance')).toBe('🔵');
    expect(refxStatusEmoji('degraded_performance')).toBe('🟡');
    expect(refxStatusEmoji('major_outage')).toBe('🔴');
  });
});

describe('refxNodesSchema', () => {
  it('parses a full node-metrics payload', () => {
    const parsed = refxNodesSchema.parse({
      success: true,
      data: {
        updatedAt: '2026-06-30T17:32:50.707Z',
        regions: [
          {
            code: 'ca-east',
            name: 'CA east',
            status: 'operational',
            nodesUp: 1,
            nodesTotal: 1,
            nodes: [
              {
                name: 'refx-ca-east-bhs',
                status: 'operational',
                cpuPercent: 31.4,
                memoryUsedMb: 18342,
                memoryTotalMb: 65536,
                diskPercent: 22.9,
                serversOnline: 12,
                serversMax: 40,
                uptimeSeconds: 1843200,
              },
            ],
          },
        ],
      },
    });
    expect(parsed.data.regions[0]?.nodes[0]?.cpuPercent).toBe(31.4);
  });

  it('tolerates a node with only partial metrics', () => {
    const parsed = refxNodesSchema.parse({
      data: {
        regions: [
          {
            code: 'x',
            name: 'X',
            status: 'up',
            nodes: [{ name: 'n', status: 'up', cpuPercent: 5 }],
          },
        ],
      },
    });
    const node = parsed.data.regions[0]?.nodes[0];
    expect(node?.cpuPercent).toBe(5);
    expect(node?.memoryPercent).toBeUndefined();
  });
});

describe('fetchRefxNodes', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns null and makes no request without a token', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchRefxNodes(undefined)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null on 401/403 (silent fallback)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 401 })),
    );
    expect(await fetchRefxNodes('t')).toBeNull();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 403 })),
    );
    expect(await fetchRefxNodes('t')).toBeNull();
  });

  it('parses a 200 payload and throws on 500', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: { regions: [] } }) })),
    );
    const result = await fetchRefxNodes('t');
    expect(result?.data.regions).toEqual([]);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500 })),
    );
    await expect(fetchRefxNodes('t')).rejects.toThrow();
  });
});

describe('refx metric formatting', () => {
  it('formats uptime compactly', () => {
    expect(formatUptime(0)).toBe('0m');
    expect(formatUptime(1843200)).toBe('21d 8h');
    expect(formatUptime(3700)).toBe('1h 1m');
    expect(formatUptime(120)).toBe('2m');
  });

  it('builds a node metrics line and derives missing percentages', () => {
    expect(nodeMetricsLine({ name: 'n', status: 'up' })).toBe('');
    const line = nodeMetricsLine({
      name: 'n',
      status: 'up',
      cpuPercent: 30,
      memoryUsedMb: 1000,
      memoryTotalMb: 2000,
      serversOnline: 3,
      serversMax: 10,
    });
    expect(line).toContain('CPU 30%');
    expect(line).toContain('RAM 50%');
    expect(line).toContain('3/10');
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

  it('rejects unknown events and missing timestamp', () => {
    expect(
      refxWebhookSchema.safeParse({ event: 'nope', timestamp: 'x', data: { id: 'i' } }).success,
    ).toBe(false);
    expect(
      refxWebhookSchema.safeParse({ event: 'incident.created', data: { id: 'i' } }).success,
    ).toBe(false);
    expect(
      refxWebhookSchema.safeParse({
        event: 'component.status_changed',
        timestamp: 'x',
        data: { key: 'k' },
      }).success,
    ).toBe(false);
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
