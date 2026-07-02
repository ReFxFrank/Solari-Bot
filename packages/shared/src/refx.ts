import { z } from 'zod';

/**
 * ReFx Hosting (refx.gg) incident-alert integration (REFX_ALERTS module). The
 * dashboard receives signed status/incident webhooks from the ReFx backend and
 * the bot posts them into subscribed guild channels.
 */

/** Map a status string to a traffic-light emoji for embeds. */
export function refxStatusEmoji(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes('operational') || normalized === 'up' || normalized === 'ok') return '🟢';
  if (normalized.includes('maintenance')) return '🔵';
  if (normalized.includes('degraded') || normalized.includes('partial')) return '🟡';
  return '🔴';
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
