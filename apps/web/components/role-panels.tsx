'use client';

import { useState, useTransition } from 'react';
import { Send, Trash2 } from 'lucide-react';
import {
  rolePanelInputSchema,
  rolePanelModes,
  rolePanelTypes,
  type RolePanelInput,
  type RolePanelMode,
  type RolePanelType,
} from '@solari/shared';
import { createRolePanel, deleteRolePanel, redeployRolePanel } from '../lib/panel-actions';
import { GlassCard } from './ui/glass-card';
import { Field, SaveBar, inputClass, monoInputClass, type SaveStatus } from './ui/form';

export interface PanelSummary {
  id: string;
  title: string;
  mode: string;
  type: string;
  channelId: string | null;
  messageId: string | null;
  optionCount: number;
}

function parseOptions(text: string): RolePanelInput['options'] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [roleId, label, emoji] = line.split('|').map((part) => part.trim());
      return { roleId: roleId ?? '', label: label || (roleId ?? ''), emoji: emoji || undefined };
    })
    .filter((option) => option.roleId.length > 0);
}

const emptyForm = {
  title: '',
  description: '',
  channelId: '',
  mode: 'NORMAL' as RolePanelMode,
  type: 'BUTTON' as RolePanelType,
  optionsText: '',
};

export function RolePanels({ guildId, panels }: { guildId: string; panels: PanelSummary[] }) {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [pending, startTransition] = useTransition();

  function create(): void {
    const candidate: RolePanelInput = {
      title: form.title,
      description: form.description.trim() || null,
      channelId: form.channelId.trim() || null,
      mode: form.mode,
      type: form.type,
      options: parseOptions(form.optionsText),
    };
    if (!rolePanelInputSchema.safeParse(candidate).success) {
      setStatus('error');
      return;
    }
    startTransition(async () => {
      const result = await createRolePanel(guildId, candidate);
      if (result.ok) {
        setForm(emptyForm);
        setStatus('saved');
      } else {
        setStatus('error');
      }
    });
  }

  function redeploy(panelId: string): void {
    startTransition(async () => {
      await redeployRolePanel(guildId, panelId);
    });
  }

  function remove(panelId: string): void {
    startTransition(async () => {
      await deleteRolePanel(guildId, panelId);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-white/80">Panels</h3>
        {panels.length === 0 ? (
          <GlassCard className="p-6 text-center text-sm text-white/40">No panels yet.</GlassCard>
        ) : (
          <GlassCard className="divide-y divide-white/5 p-0">
            {panels.map((panel) => (
              <div key={panel.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white/90">{panel.title}</p>
                  <p className="font-mono text-xs text-white/40">
                    {panel.type} · {panel.mode} · {panel.optionCount} roles ·{' '}
                    {panel.channelId ? `#${panel.channelId}` : 'no channel'} ·{' '}
                    {panel.messageId ? 'deployed' : 'not deployed'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => redeploy(panel.id)}
                  disabled={pending || !panel.channelId}
                  title="Deploy / redeploy"
                  className="rounded-md border border-white/10 p-1.5 text-white/60 hover:text-white disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(panel.id)}
                  disabled={pending}
                  title="Delete"
                  className="rounded-md border border-[var(--color-danger)]/30 p-1.5 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </GlassCard>
        )}
      </div>

      <GlassCard className="flex flex-col gap-4 p-5">
        <h3 className="text-sm font-semibold text-white/80">New panel</h3>
        <Field label="Title">
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </Field>
        <Field label="Description" hint="Optional text shown above the buttons.">
          <textarea
            rows={2}
            className={inputClass}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Channel ID">
            <input
              className={monoInputClass}
              value={form.channelId}
              onChange={(e) => setForm((f) => ({ ...f, channelId: e.target.value }))}
            />
          </Field>
          <Field label="Type">
            <select
              className={inputClass}
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as RolePanelType }))}
            >
              {rolePanelTypes.map((type) => (
                <option key={type} value={type} className="bg-[var(--color-base-elevated)]">
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mode">
            <select
              className={inputClass}
              value={form.mode}
              onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as RolePanelMode }))}
            >
              {rolePanelModes.map((mode) => (
                <option key={mode} value={mode} className="bg-[var(--color-base-elevated)]">
                  {mode}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Roles" hint="One per line: roleId | label | emoji (emoji optional). Max 25.">
          <textarea
            rows={4}
            className={monoInputClass}
            value={form.optionsText}
            onChange={(e) => setForm((f) => ({ ...f, optionsText: e.target.value }))}
            placeholder="123456789 | Announcements | 📣"
          />
        </Field>
        <SaveBar
          pending={pending}
          status={status}
          onSave={create}
          label="Create panel"
          savedMessage="Created — deploying to the channel."
        />
      </GlassCard>
    </div>
  );
}
