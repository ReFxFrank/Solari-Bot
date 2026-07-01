'use client';

import { useState, useTransition } from 'react';
import type { StarboardConfig } from '@solari/shared';
import { saveStarboardConfig } from '../lib/config-actions';
import { Switch } from './ui/switch';
import { Field, SaveBar, inputClass, monoInputClass, type SaveStatus } from './ui/form';

const toList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export function StarboardForm({ guildId, initial }: { guildId: string; initial: StarboardConfig }) {
  const [config, setConfig] = useState<StarboardConfig>(initial);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [pending, startTransition] = useTransition();

  function update<K extends keyof StarboardConfig>(key: K, value: StarboardConfig[K]): void {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
  }

  function save(): void {
    startTransition(async () => {
      const result = await saveStarboardConfig(guildId, config);
      setStatus(result.ok ? 'saved' : 'error');
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Field label="Starboard channel ID" hint="Where starred messages are posted.">
        <input
          className={monoInputClass}
          value={config.channelId ?? ''}
          onChange={(e) => update('channelId', e.target.value.trim() || null)}
          placeholder="optional"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Emoji" hint="Unicode emoji or a custom emoji id.">
          <input
            className={inputClass}
            value={config.emoji}
            onChange={(e) => update('emoji', e.target.value || '⭐')}
          />
        </Field>
        <Field label="Threshold" hint="Stars required to reach the board.">
          <input
            type="number"
            min={1}
            className={inputClass}
            value={config.threshold}
            onChange={(e) => update('threshold', Math.max(1, Number(e.target.value) || 1))}
          />
        </Field>
      </div>

      <Field label="Ignored channels" hint="Comma-separated channel IDs to exclude.">
        <input
          className={monoInputClass}
          value={config.ignoredChannelIds.join(', ')}
          onChange={(e) => update('ignoredChannelIds', toList(e.target.value))}
        />
      </Field>

      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <div>
          <p className="text-sm text-white/90">Count self-stars</p>
          <p className="text-xs text-white/50">Let authors star their own messages.</p>
        </div>
        <Switch
          checked={config.selfStar}
          onChange={(next) => update('selfStar', next)}
          label="Count self-stars"
        />
      </div>

      <SaveBar pending={pending} status={status} onSave={save} />
    </div>
  );
}
