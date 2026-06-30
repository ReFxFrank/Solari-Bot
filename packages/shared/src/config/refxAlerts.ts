import { z } from 'zod';
import { REFX_WEBHOOK_EVENTS, type RefxAlertData, type RefxWebhookEvent } from '../refx';

/** Severity levels a guild can filter on, low → high. `maintenance` ranks
 *  below everything so a `minor` floor still excludes scheduled maintenance. */
export const REFX_SEVERITIES = ['maintenance', 'minor', 'major', 'critical'] as const;
export type RefxSeverity = (typeof REFX_SEVERITIES)[number];

const SEVERITY_RANK: Record<RefxSeverity, number> = {
  maintenance: 0,
  minor: 1,
  major: 2,
  critical: 3,
};

function severityRank(value: string): number {
  const key = value.toLowerCase();
  // An unknown/renamed label ranks at the TOP so a present-but-unrecognized
  // severity passes any floor and triggers mentions — fail open, matching the
  // documented contract. Coercing it to 'minor' would silently drop a real
  // high-severity incident the moment the backend introduces a new label.
  return key in SEVERITY_RANK ? SEVERITY_RANK[key as RefxSeverity] : SEVERITY_RANK.critical;
}

export const refxAlertsConfigSchema = z.object({
  /** Channel that receives alerts. Null = no delivery even if enabled. */
  channelId: z.string().nullable().default(null),
  /** Which event types to post. Defaults to all. */
  events: z.array(z.enum(REFX_WEBHOOK_EVENTS)).default([...REFX_WEBHOOK_EVENTS]),
  /** If non-empty, only post events whose regionCode is in this list. */
  regionFilter: z.array(z.string()).default([]),
  /** Minimum incident severity to post. Null = no severity floor. */
  minSeverity: z.enum(REFX_SEVERITIES).nullable().default(null),
  /** Role to mention when an alert is at/above `mentionMinSeverity`. */
  mentionRoleId: z.string().nullable().default(null),
  mentionMinSeverity: z.enum(REFX_SEVERITIES).nullable().default(null),
});

export type RefxAlertsConfig = z.infer<typeof refxAlertsConfigSchema>;

/**
 * Whether a guild's subscription wants this event. Filtering FAILS OPEN on
 * missing fields: an event with no `regionCode` matches any region filter and
 * an event with no `severity` passes any severity floor — better to over-alert
 * than silently drop a real incident because the backend renamed a field.
 */
export function refxAlertMatches(
  config: RefxAlertsConfig,
  event: RefxWebhookEvent,
  data: RefxAlertData,
): boolean {
  if (!config.events.includes(event)) return false;

  if (config.regionFilter.length > 0 && data.regionCode) {
    // Case-insensitive: dashboard input is free text, backend codes are fixed.
    const region = data.regionCode.toLowerCase();
    if (!config.regionFilter.some((entry) => entry.toLowerCase() === region)) return false;
  }

  if (config.minSeverity && data.severity) {
    if (severityRank(data.severity) < SEVERITY_RANK[config.minSeverity]) return false;
  }

  return true;
}

/** Whether an alert should ping the mention role, given its severity. */
export function refxAlertShouldMention(config: RefxAlertsConfig, data: RefxAlertData): boolean {
  if (!config.mentionRoleId) return false;
  if (!config.mentionMinSeverity) return true; // mention on every delivered alert
  if (!data.severity) return true; // fail open
  return severityRank(data.severity) >= SEVERITY_RANK[config.mentionMinSeverity];
}
