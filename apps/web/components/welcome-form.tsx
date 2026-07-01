'use client';

import { useState, useTransition } from 'react';
import type { WelcomeConfig } from '@solari/shared';
import { saveWelcomeConfig } from '../lib/config-actions';
import { Switch } from './ui/switch';
import { Field, SaveBar, inputClass, monoInputClass, type SaveStatus } from './ui/form';

export function WelcomeForm({ guildId, initial }: { guildId: string; initial: WelcomeConfig }) {
  const [config, setConfig] = useState<WelcomeConfig>(initial);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [pending, startTransition] = useTransition();

  function update<K extends keyof WelcomeConfig>(key: K, value: WelcomeConfig[K]): void {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
  }

  function save(): void {
    startTransition(async () => {
      const result = await saveWelcomeConfig(guildId, config);
      setStatus(result.ok ? 'saved' : 'error');
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Field label="Welcome channel ID" hint="Where join messages are posted (blank to disable).">
        <input
          className={monoInputClass}
          value={config.channelId ?? ''}
          onChange={(e) => update('channelId', e.target.value.trim() || null)}
          placeholder="optional"
        />
      </Field>

      <Field
        label="Welcome message"
        hint="Variables: {user} {server} {memberCount} {accountAge} {user.tag}"
      >
        <textarea
          rows={2}
          className={inputClass}
          value={config.message}
          onChange={(e) => update('message', e.target.value)}
        />
      </Field>

      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <div>
          <p className="text-sm text-white/90">Also DM the new member</p>
          <p className="text-xs text-white/50">Send a private greeting on join.</p>
        </div>
        <Switch
          checked={config.dmEnabled}
          onChange={(next) => update('dmEnabled', next)}
          label="DM new members"
        />
      </div>

      {config.dmEnabled && (
        <Field label="DM message" hint="Same variables as above.">
          <textarea
            rows={2}
            className={inputClass}
            value={config.dmMessage}
            onChange={(e) => update('dmMessage', e.target.value)}
          />
        </Field>
      )}

      <Field label="Leave channel ID" hint="Where leave messages are posted (blank to disable).">
        <input
          className={monoInputClass}
          value={config.leaveChannelId ?? ''}
          onChange={(e) => update('leaveChannelId', e.target.value.trim() || null)}
          placeholder="optional"
        />
      </Field>

      <Field label="Leave message" hint="Variables: {user} {server} {memberCount}">
        <textarea
          rows={2}
          className={inputClass}
          value={config.leaveMessage}
          onChange={(e) => update('leaveMessage', e.target.value)}
        />
      </Field>

      <SaveBar pending={pending} status={status} onSave={save} />
    </div>
  );
}
