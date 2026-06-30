'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { customCommandInputSchema, type CustomCommandInput, type EmbedSpec } from '@helios/shared';
import { deleteCustomCommand, upsertCustomCommand } from '../lib/customcommands-actions';
import { GlassCard } from './ui/glass-card';
import { Field, SaveBar, inputClass, monoInputClass, type SaveStatus } from './ui/form';

export interface TagSummary {
  name: string;
  content: string | null;
  embed: EmbedSpec | null;
  uses: number;
}

const emptyForm = {
  name: '',
  content: '',
  title: '',
  description: '',
  color: '',
  url: '',
  imageUrl: '',
  thumbnailUrl: '',
  footer: '',
};
type FormState = typeof emptyForm;

function buildInput(form: FormState): CustomCommandInput {
  const embedEntries = {
    title: form.title.trim() || undefined,
    description: form.description.trim() || undefined,
    color: form.color.trim() || undefined,
    url: form.url.trim() || undefined,
    imageUrl: form.imageUrl.trim() || undefined,
    thumbnailUrl: form.thumbnailUrl.trim() || undefined,
    footer: form.footer.trim() || undefined,
  };
  const hasEmbed = Object.values(embedEntries).some(Boolean);
  return {
    name: form.name.trim().toLowerCase(),
    content: form.content.trim() || undefined,
    embed: hasEmbed ? embedEntries : undefined,
  };
}

function formFromTag(tag: TagSummary): FormState {
  return {
    name: tag.name,
    content: tag.content ?? '',
    title: tag.embed?.title ?? '',
    description: tag.embed?.description ?? '',
    color: tag.embed?.color ?? '',
    url: tag.embed?.url ?? '',
    imageUrl: tag.embed?.imageUrl ?? '',
    thumbnailUrl: tag.embed?.thumbnailUrl ?? '',
    footer: tag.embed?.footer ?? '',
  };
}

export function CustomCommandsManager({ guildId, tags }: { guildId: string; tags: TagSummary[] }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof FormState>(key: K, value: string): void {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
    setError(null);
  }

  function save(): void {
    const candidate = buildInput(form);
    const parsed = customCommandInputSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid tag.');
      setStatus('error');
      return;
    }
    startTransition(async () => {
      const result = await upsertCustomCommand(guildId, candidate);
      if (result.ok) {
        setForm(emptyForm);
        setStatus('saved');
      } else {
        setError(result.error ?? 'Could not save.');
        setStatus('error');
      }
    });
  }

  function remove(name: string): void {
    startTransition(async () => {
      await deleteCustomCommand(guildId, name);
    });
  }

  const embedInput = (label: string, key: keyof FormState, mono = false): ReactNode => (
    <Field label={label}>
      <input
        className={mono ? monoInputClass : inputClass}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
      />
    </Field>
  );

  return (
    <div className="flex flex-col gap-6">
      <GlassCard className="flex flex-col gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tag name" hint="lowercase, no spaces — invoked as {prefix}name.">
            <input
              className={monoInputClass}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="rules"
            />
          </Field>
        </div>
        <Field
          label="Text response"
          hint="Optional if you set an embed. Supports {user}, {server}."
        >
          <textarea
            className={`${inputClass} min-h-20 resize-y`}
            value={form.content}
            onChange={(e) => set('content', e.target.value)}
            maxLength={2000}
          />
        </Field>

        <details className="rounded-lg border border-white/10 p-3">
          <summary className="cursor-pointer text-sm font-medium text-white/80">
            Embed (optional)
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {embedInput('Title', 'title')}
              {embedInput('Color (hex)', 'color', true)}
            </div>
            <Field label="Description">
              <textarea
                className={`${inputClass} min-h-16 resize-y`}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                maxLength={4000}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              {embedInput('Title URL', 'url', true)}
              {embedInput('Footer', 'footer')}
              {embedInput('Image URL', 'imageUrl', true)}
              {embedInput('Thumbnail URL', 'thumbnailUrl', true)}
            </div>
          </div>
        </details>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <SaveBar
          pending={pending}
          status={status}
          onSave={save}
          label="Save tag"
          savedMessage="Saved."
        />
      </GlassCard>

      {tags.length > 0 && (
        <GlassCard className="divide-y divide-white/5 p-0">
          {tags.map((tag) => (
            <div key={tag.name} className="flex items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono font-medium text-white/90">{tag.name}</p>
                <p className="truncate text-xs text-white/40">
                  {tag.embed ? '[embed] ' : ''}
                  {tag.content ?? ''} · {tag.uses} uses
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm(formFromTag(tag))}
                title="Edit"
                className="rounded-md border border-white/10 p-1.5 text-white/60 hover:text-white"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(tag.name)}
                disabled={pending}
                title="Delete"
                className="rounded-md border border-white/10 p-1.5 text-white/60 hover:text-[var(--color-danger)] disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </GlassCard>
      )}
    </div>
  );
}
