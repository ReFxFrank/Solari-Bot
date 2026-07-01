'use client';

import { useState, useTransition } from 'react';
import type { LoggingConfig } from '@solari/shared';
import { saveLoggingConfig } from '../lib/config-actions';
import { Field, SaveBar, monoInputClass, type SaveStatus } from './ui/form';

const toList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export function LoggingForm({ guildId, initial }: { guildId: string; initial: LoggingConfig }) {
  const [config, setConfig] = useState<LoggingConfig>(initial);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [pending, startTransition] = useTransition();

  function update<K extends keyof LoggingConfig>(key: K, value: LoggingConfig[K]): void {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
  }

  function save(): void {
    startTransition(async () => {
      const result = await saveLoggingConfig(guildId, config);
      setStatus(result.ok ? 'saved' : 'error');
    });
  }

  const channelField = (
    label: string,
    key: 'messageChannelId' | 'memberChannelId' | 'serverChannelId' | 'voiceChannelId',
  ) => (
    <Field label={label} hint="Channel ID — blank to disable this category.">
      <input
        className={monoInputClass}
        value={config[key] ?? ''}
        onChange={(e) => update(key, e.target.value.trim() || null)}
        placeholder="optional"
      />
    </Field>
  );

  return (
    <div className="flex flex-col gap-5">
      {channelField('Message log channel', 'messageChannelId')}
      {channelField('Member log channel', 'memberChannelId')}
      {channelField('Server log channel', 'serverChannelId')}
      {channelField('Voice log channel', 'voiceChannelId')}

      <Field label="Ignored channels" hint="Comma-separated channel IDs to skip.">
        <input
          className={monoInputClass}
          value={config.ignoredChannelIds.join(', ')}
          onChange={(e) => update('ignoredChannelIds', toList(e.target.value))}
        />
      </Field>
      <Field label="Ignored roles" hint="Events from members with these roles are skipped.">
        <input
          className={monoInputClass}
          value={config.ignoredRoleIds.join(', ')}
          onChange={(e) => update('ignoredRoleIds', toList(e.target.value))}
        />
      </Field>
      <Field label="Ignored users" hint="Comma-separated user IDs to skip.">
        <input
          className={monoInputClass}
          value={config.ignoredUserIds.join(', ')}
          onChange={(e) => update('ignoredUserIds', toList(e.target.value))}
        />
      </Field>

      <SaveBar pending={pending} status={status} onSave={save} />
    </div>
  );
}
