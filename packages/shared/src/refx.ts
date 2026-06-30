import { z } from 'zod';

/**
 * ReFx Hosting (refx.gg) public status feed. The panel API exposes an
 * unauthenticated `GET /api/v1/status` that reports overall status, per-service
 * components, per-region node counts + node status, and incidents — everything
 * needed to surface infra/node health in Discord, no API key required.
 */
export const DEFAULT_REFX_STATUS_URL = 'https://api.refx.gg/api/v1/status';

export const refxComponentSchema = z.object({
  key: z.string(),
  name: z.string(),
  status: z.string(),
});

export const refxNodeSchema = z.object({
  name: z.string(),
  status: z.string(),
});

export const refxRegionSchema = z.object({
  code: z.string(),
  name: z.string(),
  country: z.string().optional(),
  status: z.string(),
  nodesUp: z.number().int().default(0),
  nodesTotal: z.number().int().default(0),
  nodes: z.array(refxNodeSchema).default([]),
});

export const refxIncidentSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    status: z.string().optional(),
    severity: z.string().optional(),
  })
  .passthrough();

export const refxStatusSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    status: z.string(),
    updatedAt: z.string().optional(),
    components: z.array(refxComponentSchema).default([]),
    regions: z.array(refxRegionSchema).default([]),
    incidents: z
      .object({
        active: z.array(refxIncidentSchema).default([]),
        recent: z.array(refxIncidentSchema).default([]),
      })
      .default({ active: [], recent: [] }),
  }),
});

export type RefxStatus = z.infer<typeof refxStatusSchema>;
export type RefxStatusData = RefxStatus['data'];
export type RefxRegion = z.infer<typeof refxRegionSchema>;

/** Fetch + validate the ReFx status feed. Throws on network/parse failure. */
export async function fetchRefxStatus(url: string = DEFAULT_REFX_STATUS_URL): Promise<RefxStatus> {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`ReFx status fetch failed (${response.status})`);
  return refxStatusSchema.parse(await response.json());
}

/** Map a status string to a traffic-light emoji for embeds. */
export function refxStatusEmoji(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes('operational') || normalized === 'up' || normalized === 'ok') return '🟢';
  if (normalized.includes('maintenance')) return '🔵';
  if (normalized.includes('degraded') || normalized.includes('partial')) return '🟡';
  return '🔴';
}

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated node-metrics feed (GET /api/v1/status/nodes, status:read token)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_REFX_NODES_URL = 'https://api.refx.gg/api/v1/status/nodes';

/** A node enriched with optional live metrics. Every metric is optional so a
 *  backend that reports partial data still parses and degrades gracefully. */
export const refxNodeMetricsSchema = z.object({
  name: z.string(),
  status: z.string(),
  cpuPercent: z.number().min(0).max(100).optional(),
  memoryUsedMb: z.number().nonnegative().optional(),
  memoryTotalMb: z.number().nonnegative().optional(),
  memoryPercent: z.number().min(0).max(100).optional(),
  diskUsedGb: z.number().nonnegative().optional(),
  diskTotalGb: z.number().nonnegative().optional(),
  diskPercent: z.number().min(0).max(100).optional(),
  serversOnline: z.number().int().nonnegative().optional(),
  serversMax: z.number().int().nonnegative().optional(),
  uptimeSeconds: z.number().nonnegative().optional(),
});

export const refxNodesRegionSchema = z.object({
  code: z.string(),
  name: z.string(),
  status: z.string(),
  nodesUp: z.number().int().default(0),
  nodesTotal: z.number().int().default(0),
  nodes: z.array(refxNodeMetricsSchema).default([]),
});

export const refxNodesSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    updatedAt: z.string().optional(),
    regions: z.array(refxNodesRegionSchema).default([]),
  }),
});

export type RefxNodes = z.infer<typeof refxNodesSchema>;
export type RefxNodeMetrics = z.infer<typeof refxNodeMetricsSchema>;

/**
 * Fetch the authenticated per-node metrics feed. Returns `null` (silent
 * fallback to the public feed) when no token is configured or the token is
 * rejected (401/403). Throws on other transport/parse failures so real
 * outages surface. 10s timeout.
 */
export async function fetchRefxNodes(
  token: string | undefined,
  url: string = DEFAULT_REFX_NODES_URL,
): Promise<RefxNodes | null> {
  if (!token) return null;
  const response = await fetch(url, {
    headers: { accept: 'application/json', authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error(`ReFx nodes fetch failed (${response.status})`);
  return refxNodesSchema.parse(await response.json());
}

/** Format a duration in seconds as a compact uptime string ("12d 4h"). */
export function formatUptime(seconds: number): string {
  if (seconds <= 0) return '0m';
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Compact one-line metric summary for a node, or '' if it has no metrics. */
export function nodeMetricsLine(node: RefxNodeMetrics): string {
  const parts: string[] = [];
  if (node.cpuPercent !== undefined) parts.push(`CPU ${Math.round(node.cpuPercent)}%`);
  const memPercent =
    node.memoryPercent ??
    (node.memoryUsedMb !== undefined && node.memoryTotalMb
      ? (node.memoryUsedMb / node.memoryTotalMb) * 100
      : undefined);
  if (memPercent !== undefined) parts.push(`RAM ${Math.round(memPercent)}%`);
  const diskPercent =
    node.diskPercent ??
    (node.diskUsedGb !== undefined && node.diskTotalGb
      ? (node.diskUsedGb / node.diskTotalGb) * 100
      : undefined);
  if (diskPercent !== undefined) parts.push(`Disk ${Math.round(diskPercent)}%`);
  if (node.serversOnline !== undefined) {
    // `serversMax` is optional in the feed — show the running count alone when
    // there's no capacity to compare against.
    parts.push(
      node.serversMax !== undefined
        ? `${node.serversOnline}/${node.serversMax} servers`
        : `${node.serversOnline} servers`,
    );
  }
  if (node.uptimeSeconds !== undefined) parts.push(`up ${formatUptime(node.uptimeSeconds)}`);
  return parts.join(' · ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Inbound status/incident webhook (signed by the ReFx backend)
// ─────────────────────────────────────────────────────────────────────────────

export const REFX_WEBHOOK_EVENTS = [
  'incident.created',
  'incident.updated',
  'incident.resolved',
  'component.status_changed',
] as const;
export type RefxWebhookEvent = (typeof REFX_WEBHOOK_EVENTS)[number];

/**
 * Incident payload. All fields are optional and `.passthrough()` keeps unknown
 * ones: because only the authenticated ReFx backend can produce a valid
 * signature, we parse trusted webhook data FAIL-OPEN — a real, signed incident
 * must never be dropped (422) just because a field was renamed or omitted. The
 * envelope (`event` + `timestamp`) stays strict; rendering tolerates missing
 * fields (see `buildRefxAlert`).
 */
export const refxIncidentEventDataSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    status: z.string().optional(),
    severity: z.string().optional(),
    regionCode: z.string().optional(),
    // A malformed url is dropped (→ undefined), not fatal, so it can't 422 a
    // real incident; keeping `.url()` also keeps `embed.setURL` safe downstream.
    url: z.string().url().optional().catch(undefined),
    body: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const refxComponentEventDataSchema = z
  .object({
    key: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    previousStatus: z.string().optional(),
    regionCode: z.string().optional(),
  })
  .passthrough();

export const refxWebhookSchema = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('incident.created'),
    timestamp: z.string(),
    data: refxIncidentEventDataSchema,
  }),
  z.object({
    event: z.literal('incident.updated'),
    timestamp: z.string(),
    data: refxIncidentEventDataSchema,
  }),
  z.object({
    event: z.literal('incident.resolved'),
    timestamp: z.string(),
    data: refxIncidentEventDataSchema,
  }),
  z.object({
    event: z.literal('component.status_changed'),
    timestamp: z.string(),
    data: refxComponentEventDataSchema,
  }),
]);
export type RefxWebhookBody = z.infer<typeof refxWebhookSchema>;

/** Structural view of webhook data used for filtering + alert rendering. */
export interface RefxAlertData {
  id?: string;
  title?: string;
  name?: string;
  status?: string;
  previousStatus?: string;
  severity?: string;
  regionCode?: string;
  url?: string;
  body?: string;
}

export type RefxAlertKind = 'danger' | 'warning' | 'success' | 'info';

export interface RefxAlertContent {
  title: string;
  description: string;
  kind: RefxAlertKind;
}

/** Pure render of a webhook event into branded-embed-ready fields. */
export function buildRefxAlert(event: RefxWebhookEvent, data: RefxAlertData): RefxAlertContent {
  const label = data.title ?? data.name ?? 'ReFx status';
  const region = data.regionCode ? ` (${data.regionCode})` : '';
  const detail = data.body ?? data.status ?? '';
  switch (event) {
    case 'incident.created':
      return {
        kind: 'danger',
        title: `🚨 Incident: ${label}${region}`,
        description: detail || 'A new incident has been opened.',
      };
    case 'incident.updated':
      return {
        kind: 'warning',
        title: `📣 Incident update: ${label}${region}`,
        description: detail || 'The incident has been updated.',
      };
    case 'incident.resolved':
      return {
        kind: 'success',
        title: `✅ Resolved: ${label}${region}`,
        description: detail || 'The incident has been resolved.',
      };
    case 'component.status_changed': {
      const transition = data.previousStatus
        ? `${data.previousStatus} → ${data.status ?? 'unknown'}`
        : (data.status ?? 'unknown');
      return {
        kind: data.status && refxStatusEmoji(data.status) === '🟢' ? 'success' : 'warning',
        title: `${data.status ? refxStatusEmoji(data.status) : '🔔'} ${label}${region}`,
        description: `Status changed: ${transition}`,
      };
    }
  }
}
