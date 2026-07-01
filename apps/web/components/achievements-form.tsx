'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  ACHIEVEMENT_TYPES,
  ACHIEVEMENT_TYPE_LABELS,
  achievementsConfigSchema,
  type Achievement,
  type AchievementsConfig,
} from '@solari/shared';
import type { ChannelOption, RoleOption } from '../lib/discord-guild';
import { saveAchievementsConfig } from '../lib/config-actions';
import { Switch } from './ui/switch';
import { Field, SaveBar, inputClass, type SaveStatus } from './ui/form';
import { ChannelSelect, RoleSelect } from './ui/entity-select';

const MAX_ACHIEVEMENTS = 50;

function newAchievement(): Achievement {
  return {
    id: crypto.randomUUID(),
    name: '',
    type: 'LEVEL',
    threshold: 10,
    rewardRoleId: null,
    rewardCoins: 0,
    rewardXp: 0,
  };
}

export function AchievementsForm({
  guildId,
  initial,
  roles,
  channels,
}: {
  guildId: string;
  initial: AchievementsConfig;
  roles: RoleOption[];
  channels: ChannelOption[];
}) {
  const [config, setConfig] = useState<AchievementsConfig>(initial);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof AchievementsConfig>(key: K, value: AchievementsConfig[K]): void {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
    setError(null);
  }

  function patchAchievement(index: number, p: Partial<Achievement>): void {
    setConfig((prev) => ({
      ...prev,
      achievements: prev.achievements.map((a, i) => (i === index ? { ...a, ...p } : a)),
    }));
    setStatus('idle');
    setError(null);
  }

  function addAchievement(): void {
    setConfig((prev) =>
      prev.achievements.length >= MAX_ACHIEVEMENTS
        ? prev
        : { ...prev, achievements: [...prev.achievements, newAchievement()] },
    );
    setStatus('idle');
    setError(null);
  }

  function removeAchievement(index: number): void {
    setConfig((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index),
    }));
    setStatus('idle');
    setError(null);
  }

  function save(): void {
    startTransition(async () => {
      const cleaned: AchievementsConfig = {
        ...config,
        achievements: config.achievements.filter((a) => a.name.trim()),
      };
      const parsed = achievementsConfigSchema.safeParse(cleaned);
      if (!parsed.success) {
        setStatus('error');
        setError(parsed.error.issues[0]?.message ?? 'Some achievements are invalid.');
        return;
      }
      setError(null);
      const result = await saveAchievementsConfig(guildId, parsed.data);
      setStatus(result.ok ? 'saved' : 'error');
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <div>
          <p className="text-sm text-white/90">Announce unlocks</p>
          <p className="text-xs text-white/50">Post a message when a member unlocks an achievement.</p>
        </div>
        <Switch
          checked={config.announce}
          onChange={(next) => update('announce', next)}
          label="Announce unlocks"
        />
      </div>

      {config.announce && (
        <Field label="Announcement channel" hint="Where unlock messages post.">
          <ChannelSelect
            channels={channels}
            only="text"
            placeholder="None"
            selected={config.announceChannelId ? [config.announceChannelId] : []}
            onChange={(ids) => update('announceChannelId', ids[0] ?? null)}
          />
        </Field>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white/80">Achievements</span>
          <span className="text-xs text-white/40">
            {config.achievements.length}/{MAX_ACHIEVEMENTS}
          </span>
        </div>

        {config.achievements.length === 0 && (
          <p className="text-sm text-white/40">No achievements yet. Add one to get started.</p>
        )}

        {config.achievements.map((achievement, index) => (
          <div
            key={achievement.id}
            className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3"
          >
            <div className="flex items-start gap-2">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="First Steps"
                    maxLength={100}
                    value={achievement.name}
                    onChange={(e) => patchAchievement(index, { name: e.target.value })}
                  />
                </Field>
                <Field label="Description" hint="Optional.">
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Reach level 10"
                    maxLength={200}
                    value={achievement.description ?? ''}
                    onChange={(e) =>
                      patchAchievement(index, { description: e.target.value || undefined })
                    }
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => removeAchievement(index)}
                title="Remove"
                className="mt-6 rounded-md border border-white/10 p-1.5 text-white/50 hover:text-[var(--color-danger)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Type">
                <select
                  className={inputClass}
                  value={achievement.type}
                  onChange={(e) =>
                    patchAchievement(index, { type: e.target.value as Achievement['type'] })
                  }
                >
                  {ACHIEVEMENT_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-[var(--color-base-elevated)]">
                      {ACHIEVEMENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Threshold">
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={achievement.threshold}
                  onChange={(e) =>
                    patchAchievement(index, {
                      threshold: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </Field>
            </div>

            <Field label="Reward role" hint="Granted on unlock. Optional.">
              <RoleSelect
                roles={roles}
                placeholder="None"
                selected={achievement.rewardRoleId ? [achievement.rewardRoleId] : []}
                onChange={(ids) => patchAchievement(index, { rewardRoleId: ids[0] ?? null })}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Reward coins">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={achievement.rewardCoins}
                  onChange={(e) =>
                    patchAchievement(index, {
                      rewardCoins: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </Field>
              <Field label="Reward XP">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={achievement.rewardXp}
                  onChange={(e) =>
                    patchAchievement(index, {
                      rewardXp: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </Field>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addAchievement}
          disabled={config.achievements.length >= MAX_ACHIEVEMENTS}
          className="inline-flex w-fit items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-white/70 hover:text-white disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Add achievement
        </button>
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <SaveBar pending={pending} status={status} onSave={save} />
    </div>
  );
}
