'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Megaphone, Plus, Trash2 } from 'lucide-react';
import type { IncidentSeverity, IncidentStatus } from '@solari/database';
import {
  INCIDENT_COMPONENTS,
  SEVERITY_META,
  STATUS_LABEL,
  formatIncidentTime,
  type IncidentDTO,
} from '../lib/incidents';
import { addIncidentUpdate, createIncident, deleteIncident } from '../lib/incident-actions';
import { GlassCard } from './ui/glass-card';
import { Field, inputClass } from './ui/form';
import { cn } from '../lib/utils';

const selectClass = `${inputClass} appearance-none`;
const SEVERITIES: IncidentSeverity[] = ['OUTAGE', 'DEGRADED', 'MAINTENANCE', 'NOTICE'];
const STATUSES: IncidentStatus[] = ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'];

export function IncidentManager({ incidents }: { incidents: IncidentDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // New-incident form.
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('DEGRADED');
  const [component, setComponent] = useState<string>('');
  const [message, setMessage] = useState('');

  // Per-incident update drafts.
  const [drafts, setDrafts] = useState<Record<string, { status: IncidentStatus; message: string }>>(
    {},
  );
  const draftFor = (incident: IncidentDTO): { status: IncidentStatus; message: string } =>
    drafts[incident.id] ?? { status: incident.status, message: '' };

  function submitNew(): void {
    setError(null);
    startTransition(async () => {
      const result = await createIncident({
        title,
        severity,
        component: component || null,
        message,
      });
      if (!result.ok) {
        setError(result.error ?? 'Could not create the incident.');
        return;
      }
      setTitle('');
      setMessage('');
      setComponent('');
      setSeverity('DEGRADED');
      router.refresh();
    });
  }

  function submitUpdate(incident: IncidentDTO): void {
    const draft = draftFor(incident);
    setError(null);
    startTransition(async () => {
      const result = await addIncidentUpdate(incident.id, draft.status, draft.message);
      if (!result.ok) {
        setError(result.error ?? 'Could not post the update.');
        return;
      }
      setDrafts((prev) => ({ ...prev, [incident.id]: { status: draft.status, message: '' } }));
      router.refresh();
    });
  }

  function remove(incident: IncidentDTO): void {
    if (!window.confirm(`Delete “${incident.title}” and its updates? This is for mistakes — resolved incidents should stay as history.`)) return;
    startTransition(async () => {
      await deleteIncident(incident.id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* New incident */}
      <GlassCard className="p-5">
        <h3 className="flex items-center gap-2 text-base font-semibold text-white/90">
          <Megaphone className="h-4 w-4 text-white/50" /> Open an incident
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Title" hint="Shown as the incident headline on /status.">
            <input
              className={inputClass}
              maxLength={150}
              placeholder="e.g. Elevated gateway latency"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Severity">
              <select
                className={selectClass}
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
              >
                {SEVERITIES.map((value) => (
                  <option key={value} value={value}>
                    {SEVERITY_META[value].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Component">
              <select
                className={selectClass}
                value={component}
                onChange={(e) => setComponent(e.target.value)}
              >
                <option value="">General</option>
                {INCIDENT_COMPONENTS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <div className="mt-4">
          <Field label="First update" hint="Posted as “Investigating”. Say what users are seeing.">
            <textarea
              className={`${inputClass} min-h-20 resize-y`}
              maxLength={2000}
              placeholder="We're investigating reports of…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
        </div>
        {error && <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>}
        <button
          type="button"
          onClick={submitNew}
          disabled={pending}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-strong)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-strong)]/85 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Publish incident
        </button>
      </GlassCard>

      {/* Existing incidents */}
      {incidents.length === 0 ? (
        <GlassCard className="p-8 text-center text-sm text-white/40">
          No incidents yet — that&rsquo;s a good thing.
        </GlassCard>
      ) : (
        incidents.map((incident) => {
          const meta = SEVERITY_META[incident.severity];
          const draft = draftFor(incident);
          const resolved = incident.status === 'RESOLVED';
          return (
            <GlassCard key={incident.id} className={cn('border p-5', meta.border, resolved && 'opacity-80')}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', meta.badge)}>
                  {meta.label}
                </span>
                {incident.component && (
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/60">
                    {incident.component}
                  </span>
                )}
                <span className="text-xs text-white/40">{formatIncidentTime(incident.createdAt)}</span>
                <span className="ml-auto flex items-center gap-2">
                  <span className={cn('text-xs font-semibold', resolved ? 'text-[var(--color-success)]' : 'text-white/60')}>
                    {STATUS_LABEL[incident.status]}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(incident)}
                    disabled={pending}
                    aria-label={`Delete ${incident.title}`}
                    className="grid h-7 w-7 place-items-center rounded-lg text-white/35 transition-colors hover:bg-[var(--color-danger)]/15 hover:text-[var(--color-danger)] disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
              <h4 className="mt-2 font-semibold text-white/90">{incident.title}</h4>

              <div className="mt-3 flex flex-col gap-2 border-l border-white/10 pl-4">
                {incident.updates.map((update) => (
                  <div key={update.id} className="text-sm">
                    <span className="font-semibold text-white/75">{STATUS_LABEL[update.status]}</span>
                    <span className="text-white/35"> · {formatIncidentTime(update.createdAt)}</span>
                    <p className="mt-0.5 whitespace-pre-wrap text-white/60">{update.message}</p>
                  </div>
                ))}
              </div>

              {/* Post an update */}
              <div className="mt-4 flex flex-col gap-2 border-t border-white/5 pt-4 sm:flex-row">
                <select
                  className={`${selectClass} sm:w-44`}
                  value={draft.status}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [incident.id]: { ...draft, status: e.target.value as IncidentStatus },
                    }))
                  }
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {STATUS_LABEL[value]}
                    </option>
                  ))}
                </select>
                <input
                  className={`${inputClass} flex-1`}
                  maxLength={2000}
                  placeholder="Update message…"
                  value={draft.message}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [incident.id]: { ...draft, message: e.target.value },
                    }))
                  }
                />
                <button
                  type="button"
                  onClick={() => submitUpdate(incident)}
                  disabled={pending || !draft.message.trim()}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.06] disabled:opacity-40"
                >
                  Post update
                </button>
              </div>
            </GlassCard>
          );
        })
      )}
    </div>
  );
}
