import type { IncidentSeverity, IncidentStatus } from '@solari/database';

/** Serialized incident shape shared by /status and the admin manager. */
export interface IncidentDTO {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  component: string | null;
  createdAt: string; // ISO
  resolvedAt: string | null; // ISO
  updates: { id: string; status: IncidentStatus; message: string; createdAt: string }[];
}

export const SEVERITY_META: Record<
  IncidentSeverity,
  { label: string; text: string; badge: string; border: string }
> = {
  OUTAGE: {
    label: 'Outage',
    text: 'text-[var(--color-danger)]',
    badge: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]',
    border: 'border-[var(--color-danger)]/30',
  },
  DEGRADED: {
    label: 'Degraded performance',
    text: 'text-[var(--color-warning)]',
    badge: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
    border: 'border-[var(--color-warning)]/30',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    text: 'text-[var(--color-info)]',
    badge: 'bg-[var(--color-info)]/15 text-[var(--color-info)]',
    border: 'border-[var(--color-info)]/30',
  },
  NOTICE: {
    label: 'Notice',
    text: 'text-[var(--color-brand-bright)]',
    badge: 'bg-[var(--color-brand)]/15 text-[var(--color-brand-bright)]',
    border: 'border-[var(--color-brand)]/30',
  },
};

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  INVESTIGATING: 'Investigating',
  IDENTIFIED: 'Identified',
  MONITORING: 'Monitoring',
  RESOLVED: 'Resolved',
};

/** Suggested "affected component" options — mirrors the status-page components. */
export const INCIDENT_COMPONENTS = [
  'Discord bot',
  'Dashboard & API',
  'Database',
  'Cache & jobs',
  'Billing',
  'Website',
] as const;

/** "Jul 2, 20:15 UTC" — compact, unambiguous incident timestamps. */
export function formatIncidentTime(iso: string): string {
  const date = new Date(iso);
  const formatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date);
  return `${formatted} UTC`;
}
