'use server';

import { revalidatePath } from 'next/cache';
import { prisma, type IncidentSeverity, type IncidentStatus } from '@solari/database';
import { requireOwner } from './auth-guards';

export interface IncidentActionResult {
  ok: boolean;
  error?: string;
}

const SEVERITIES: IncidentSeverity[] = ['OUTAGE', 'DEGRADED', 'MAINTENANCE', 'NOTICE'];
const STATUSES: IncidentStatus[] = ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'];

function refresh(): void {
  revalidatePath('/status');
  revalidatePath('/admin/incidents');
}

/** Open a status-page incident with its first update. Owner-only. */
export async function createIncident(input: {
  title: string;
  severity: IncidentSeverity;
  component?: string | null;
  message: string;
}): Promise<IncidentActionResult> {
  await requireOwner();
  const title = input.title.trim().slice(0, 150);
  const message = input.message.trim().slice(0, 2000);
  if (!title || !message) return { ok: false, error: 'Give the incident a title and a message.' };
  if (!SEVERITIES.includes(input.severity)) return { ok: false, error: 'Unknown severity.' };

  await prisma.incident.create({
    data: {
      title,
      severity: input.severity,
      component: input.component?.trim().slice(0, 60) || null,
      updates: { create: { status: 'INVESTIGATING', message } },
    },
  });
  refresh();
  return { ok: true };
}

/**
 * Post a timestamped update, moving the incident's lifecycle status with it.
 * RESOLVED stamps resolvedAt (and re-resolving is idempotent). Owner-only.
 */
export async function addIncidentUpdate(
  incidentId: string,
  status: IncidentStatus,
  message: string,
): Promise<IncidentActionResult> {
  await requireOwner();
  const text = message.trim().slice(0, 2000);
  if (!text) return { ok: false, error: 'Write an update message.' };
  if (!STATUSES.includes(status)) return { ok: false, error: 'Unknown status.' };

  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    select: { id: true, resolvedAt: true },
  });
  if (!incident) return { ok: false, error: 'Incident not found.' };

  await prisma.incident.update({
    where: { id: incidentId },
    data: {
      status,
      resolvedAt: status === 'RESOLVED' ? (incident.resolvedAt ?? new Date()) : null,
      updates: { create: { status, message: text } },
    },
  });
  refresh();
  return { ok: true };
}

/** Delete an incident (and its updates) entirely — for mistakes, not history. */
export async function deleteIncident(incidentId: string): Promise<IncidentActionResult> {
  await requireOwner();
  await prisma.incident.delete({ where: { id: incidentId } }).catch(() => undefined);
  refresh();
  return { ok: true };
}
