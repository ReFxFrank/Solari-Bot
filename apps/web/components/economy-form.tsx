'use client';

import { useState, useTransition } from 'react';
import type { EconomyConfig } from '@solari/shared';
import { saveEconomyConfig } from '../lib/config-actions';
import { Switch } from './ui/switch';
import { Field, SaveBar, inputClass, type SaveStatus } from './ui/form';

export function EconomyForm({ guildId, initial }: { guildId: string; initial: EconomyConfig }) {
  const [config, setConfig] = useState<EconomyConfig>(initial);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [pending, startTransition] = useTransition();

  function update<K extends keyof EconomyConfig>(key: K, value: EconomyConfig[K]): void {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
  }

  function num(key: keyof EconomyConfig, min: number, max: number, fallback: number) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const n = raw.trim() === '' ? NaN : Number(raw);
      update(key, Math.max(min, Math.min(max, Math.round(Number.isNaN(n) ? fallback : n))) as never);
    };
  }

  function save(): void {
    startTransition(async () => {
      // Keep workMax >= workMin so the bot's random range is always valid.
      const payload = { ...config, workMax: Math.max(config.workMin, config.workMax) };
      const result = await saveEconomyConfig(guildId, payload);
      if (result.ok) setConfig(payload);
      setStatus(result.ok ? 'saved' : 'error');
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Currency name" hint="Plural, e.g. “coins”.">
          <input
            className={inputClass}
            maxLength={32}
            value={config.currencyName}
            onChange={(e) => update('currencyName', e.target.value)}
          />
        </Field>
        <Field label="Currency symbol" hint="Emoji or short symbol.">
          <input
            className={inputClass}
            maxLength={16}
            value={config.currencySymbol}
            onChange={(e) => update('currencySymbol', e.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Starting balance" hint="New members start with this.">
          <input
            type="number"
            min={0}
            max={1_000_000}
            className={inputClass}
            value={config.startingBalance}
            onChange={num('startingBalance', 0, 1_000_000, 0)}
          />
        </Field>
        <Field label="Daily amount" hint="Granted by /daily.">
          <input
            type="number"
            min={0}
            max={1_000_000}
            className={inputClass}
            value={config.dailyAmount}
            onChange={num('dailyAmount', 0, 1_000_000, 250)}
          />
        </Field>
        <Field label="Work minimum" hint="Lowest /work payout.">
          <input
            type="number"
            min={0}
            max={1_000_000}
            className={inputClass}
            value={config.workMin}
            onChange={num('workMin', 0, 1_000_000, 50)}
          />
        </Field>
        <Field label="Work maximum" hint="Highest /work payout (kept ≥ minimum).">
          <input
            type="number"
            min={0}
            max={1_000_000}
            className={inputClass}
            value={config.workMax}
            onChange={num('workMax', 0, 1_000_000, 250)}
          />
        </Field>
        <Field label="Work cooldown (seconds)" hint="Time between /work uses (0–604800).">
          <input
            type="number"
            min={0}
            max={604_800}
            className={inputClass}
            value={config.workCooldownSeconds}
            onChange={num('workCooldownSeconds', 0, 604_800, 3600)}
          />
        </Field>
        <Field label="Max bet" hint="Largest gambling wager allowed.">
          <input
            type="number"
            min={1}
            max={100_000_000}
            className={inputClass}
            value={config.maxBet}
            onChange={num('maxBet', 1, 100_000_000, 10_000)}
          />
        </Field>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <div>
          <p className="text-sm text-white/90">Enable /rob</p>
          <p className="text-xs text-white/50">Let members steal from each other’s wallets.</p>
        </div>
        <Switch checked={config.robEnabled} onChange={(next) => update('robEnabled', next)} label="Enable rob" />
      </div>

      <SaveBar pending={pending} status={status} onSave={save} />
    </div>
  );
}
