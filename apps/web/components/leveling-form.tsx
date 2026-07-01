'use client';

import { useState, useTransition } from 'react';
import { levelUpAnnounceModes, type LevelingConfig } from '@solari/shared';
import { saveLevelingConfig } from '../lib/config-actions';
import { Switch } from './ui/switch';
import { Field, SaveBar, inputClass, monoInputClass, type SaveStatus } from './ui/form';

const toList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

function parseRewards(value: string): LevelingConfig['rewards'] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [levelPart, rolePart] = line.split(/[:\s]+/);
      return { level: Math.max(1, Number(levelPart) || 1), roleId: (rolePart ?? '').trim() };
    })
    .filter((reward) => reward.roleId.length > 0);
}

const rewardsToText = (rewards: LevelingConfig['rewards']): string =>
  rewards.map((reward) => `${reward.level}:${reward.roleId}`).join('\n');

export function LevelingForm({ guildId, initial }: { guildId: string; initial: LevelingConfig }) {
  const [config, setConfig] = useState<LevelingConfig>(initial);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [pending, startTransition] = useTransition();

  function update<K extends keyof LevelingConfig>(key: K, value: LevelingConfig[K]): void {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
  }

  function save(): void {
    startTransition(async () => {
      const result = await saveLevelingConfig(guildId, config);
      setStatus(result.ok ? 'saved' : 'error');
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="XP per message (min)">
          <input
            type="number"
            min={0}
            className={inputClass}
            value={config.textXpMin}
            onChange={(e) => update('textXpMin', Math.max(0, Number(e.target.value) || 0))}
          />
        </Field>
        <Field label="XP per message (max)">
          <input
            type="number"
            min={0}
            className={inputClass}
            value={config.textXpMax}
            onChange={(e) => update('textXpMax', Math.max(0, Number(e.target.value) || 0))}
          />
        </Field>
      </div>

      <Field label="Cooldown (seconds)" hint="Minimum seconds between XP awards per user.">
        <input
          type="number"
          min={0}
          className={inputClass}
          value={config.xpCooldownSeconds}
          onChange={(e) => update('xpCooldownSeconds', Math.max(0, Number(e.target.value) || 0))}
        />
      </Field>

      <Field label="Level-up announcement">
        <select
          className={inputClass}
          value={config.announce}
          onChange={(e) => update('announce', e.target.value as LevelingConfig['announce'])}
        >
          {levelUpAnnounceModes.map((mode) => (
            <option key={mode} value={mode} className="bg-[var(--color-base-elevated)]">
              {mode}
            </option>
          ))}
        </select>
      </Field>

      {config.announce === 'CHANNEL' && (
        <Field label="Announcement channel ID">
          <input
            className={monoInputClass}
            value={config.announceChannelId ?? ''}
            onChange={(e) => update('announceChannelId', e.target.value.trim() || null)}
          />
        </Field>
      )}

      <Field label="Level-up message" hint="Variables: {user} {level} {server}">
        <textarea
          rows={2}
          className={inputClass}
          value={config.levelUpMessage}
          onChange={(e) => update('levelUpMessage', e.target.value)}
        />
      </Field>

      <Field label="No-XP roles" hint="Comma-separated role IDs that earn no XP.">
        <input
          className={monoInputClass}
          value={config.noXpRoleIds.join(', ')}
          onChange={(e) => update('noXpRoleIds', toList(e.target.value))}
        />
      </Field>

      <Field label="No-XP channels" hint="Comma-separated channel IDs that earn no XP.">
        <input
          className={monoInputClass}
          value={config.noXpChannelIds.join(', ')}
          onChange={(e) => update('noXpChannelIds', toList(e.target.value))}
        />
      </Field>

      <Field label="Role rewards" hint="One per line as level:roleId — e.g. 5:123456789">
        <textarea
          rows={3}
          className={monoInputClass}
          value={rewardsToText(config.rewards)}
          onChange={(e) => update('rewards', parseRewards(e.target.value))}
        />
      </Field>

      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <div>
          <p className="text-sm text-white/90">Stack reward roles</p>
          <p className="text-xs text-white/50">Keep lower roles instead of replacing them.</p>
        </div>
        <Switch
          checked={config.roleRewardStack}
          onChange={(next) => update('roleRewardStack', next)}
          label="Stack reward roles"
        />
      </div>

      <SaveBar pending={pending} status={status} onSave={save} />
    </div>
  );
}
