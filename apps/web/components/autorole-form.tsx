'use client';

import { useState, useTransition } from 'react';
import type { AutoroleConfig } from '@solari/shared';
import { saveAutoroleConfig } from '../lib/config-actions';
import { Field, SaveBar, monoInputClass, type SaveStatus } from './ui/form';

const toList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export function AutoroleForm({ guildId, initial }: { guildId: string; initial: AutoroleConfig }) {
  const [config, setConfig] = useState<AutoroleConfig>(initial);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [pending, startTransition] = useTransition();

  function save(): void {
    startTransition(async () => {
      const result = await saveAutoroleConfig(guildId, config);
      setStatus(result.ok ? 'saved' : 'error');
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Field label="Roles for humans" hint="Comma-separated role IDs granted to people on join.">
        <input
          className={monoInputClass}
          value={config.humanRoleIds.join(', ')}
          onChange={(e) => {
            setConfig((prev) => ({ ...prev, humanRoleIds: toList(e.target.value) }));
            setStatus('idle');
          }}
          placeholder="123, 456"
        />
      </Field>

      <Field label="Roles for bots" hint="Comma-separated role IDs granted to bots on join.">
        <input
          className={monoInputClass}
          value={config.botRoleIds.join(', ')}
          onChange={(e) => {
            setConfig((prev) => ({ ...prev, botRoleIds: toList(e.target.value) }));
            setStatus('idle');
          }}
          placeholder="789"
        />
      </Field>

      <SaveBar pending={pending} status={status} onSave={save} />
    </div>
  );
}
