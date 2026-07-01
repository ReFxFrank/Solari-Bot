'use client';

import { useState, useTransition } from 'react';
import type { MusicConfig } from '@solari/shared';
import { musicSearchSources } from '@solari/shared';
import type { RoleOption } from '../lib/discord-guild';
import { saveMusicConfig } from '../lib/config-actions';
import { Switch } from './ui/switch';
import { RoleSelect } from './ui/entity-select';
import { Field, SaveBar, inputClass, type SaveStatus } from './ui/form';

const SOURCE_LABEL: Record<(typeof musicSearchSources)[number], string> = {
  ytsearch: 'YouTube',
  ytmsearch: 'YouTube Music',
  scsearch: 'SoundCloud',
};

export function MusicForm({
  guildId,
  initial,
  roles,
}: {
  guildId: string;
  initial: MusicConfig;
  roles: RoleOption[];
}) {
  const [config, setConfig] = useState<MusicConfig>(initial);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [pending, startTransition] = useTransition();

  function update<K extends keyof MusicConfig>(key: K, value: MusicConfig[K]): void {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
  }

  function save(): void {
    startTransition(async () => {
      const result = await saveMusicConfig(guildId, config);
      setStatus(result.ok ? 'saved' : 'error');
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Field label="DJ roles" hint="Roles allowed to skip, stop, and control playback (mods always can).">
        <RoleSelect
          roles={roles}
          multiple
          selected={config.djRoleIds}
          onChange={(ids) => update('djRoleIds', ids)}
        />
      </Field>

      <Toggle
        label="DJ-only mode"
        hint="Only DJs and mods can queue and control playback."
        checked={config.djOnly}
        onChange={(next) => update('djOnly', next)}
      />

      <Field label="Default search source" hint="Where a bare /play query is searched (URLs always resolve directly).">
        <select
          className={inputClass}
          value={config.searchSource}
          onChange={(e) => update('searchSource', e.target.value as MusicConfig['searchSource'])}
        >
          {musicSearchSources.map((source) => (
            <option key={source} value={source} className="bg-[var(--color-base-elevated)]">
              {SOURCE_LABEL[source]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Default volume" hint="Starting volume for new players (0–150).">
        <input
          type="number"
          min={0}
          max={150}
          className={inputClass}
          value={config.defaultVolume}
          onChange={(e) => update('defaultVolume', clamp(e.target.value, 0, 150, 100))}
        />
      </Field>

      <Field label="Vote-skip ratio" hint="Fraction of listeners needed to skip when a non-DJ votes (0.1–1).">
        <input
          type="number"
          min={0.1}
          max={1}
          step={0.1}
          className={inputClass}
          value={config.voteSkipRatio}
          onChange={(e) => update('voteSkipRatio', clampFloat(e.target.value, 0.1, 1, 0.5))}
        />
      </Field>

      <Field label="Max queue length" hint="Maximum tracks allowed in the queue (1–5000).">
        <input
          type="number"
          min={1}
          max={5000}
          className={inputClass}
          value={config.maxQueueLength}
          onChange={(e) => update('maxQueueLength', clamp(e.target.value, 1, 5000, 500))}
        />
      </Field>

      <Field label="Auto-leave (seconds)" hint="Disconnect this long after the queue empties (0–3600).">
        <input
          type="number"
          min={0}
          max={3600}
          className={inputClass}
          value={config.autoLeaveSeconds}
          onChange={(e) => update('autoLeaveSeconds', clamp(e.target.value, 0, 3600, 300))}
        />
      </Field>

      <Toggle
        label="Announce now playing"
        hint="Post an embed in the text channel when a new track starts."
        checked={config.announceNowPlaying}
        onChange={(next) => update('announceNowPlaying', next)}
      />

      <SaveBar pending={pending} status={status} onSave={save} />
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div>
        <p className="text-sm text-white/90">{label}</p>
        <p className="text-xs text-white/50">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function clamp(raw: string, min: number, max: number, fallback: number): number {
  return Math.max(min, Math.min(max, Math.round(Number(raw) || fallback)));
}

function clampFloat(raw: string, min: number, max: number, fallback: number): number {
  return Math.max(min, Math.min(max, Number(raw) || fallback));
}
