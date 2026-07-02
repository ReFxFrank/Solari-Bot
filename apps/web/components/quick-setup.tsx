'use client';

import { useState, useTransition } from 'react';
import {
  Gamepad2,
  LifeBuoy,
  Loader2,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { SETUP_PRESETS, type SetupPreset } from '../lib/setup-presets';
import { applySetupPreset, dismissSetup } from '../lib/setup-actions';
import { SpotlightCard } from './marketing/spotlight-card';
import { cn } from '../lib/utils';

const PRESET_ICONS: Record<SetupPreset['icon'], LucideIcon> = {
  Users,
  Gamepad2,
  LifeBuoy,
  Sparkles,
};

/**
 * First-run quick-setup wizard shown on the server overview until the owner
 * picks a preset or skips (both persist `setupCompletedAt`, so it never nags
 * again). Each card applies a curated bundle of modules with the bot's own
 * defaults; the grid below then reflects the result after revalidation.
 */
export function QuickSetup({ guildId, guildName }: { guildId: string; guildName: string }) {
  const [pending, startTransition] = useTransition();
  // Which action is in flight, so we can spin only that card / the skip link.
  const [active, setActive] = useState<string | null>(null);

  function apply(key: string): void {
    if (pending) return;
    setActive(key);
    startTransition(async () => {
      await applySetupPreset(guildId, key).catch(() => undefined);
      setActive(null);
    });
  }

  function skip(): void {
    if (pending) return;
    setActive('__skip');
    startTransition(async () => {
      await dismissSetup(guildId).catch(() => undefined);
      setActive(null);
    });
  }

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-[var(--color-brand)]/25 p-6 sm:p-8"
      style={{
        background:
          'linear-gradient(120deg, rgba(139,92,246,0.16), rgba(217,70,239,0.10) 55%, rgba(10,8,16,0) 100%)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-[var(--color-brand)]/25 blur-3xl"
      />

      <button
        type="button"
        onClick={skip}
        disabled={pending}
        aria-label="Skip setup"
        className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80 disabled:opacity-50"
      >
        {active === '__skip' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      </button>

      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-strong)]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
          <Sparkles className="h-3.5 w-3.5" /> Quick setup
        </span>
        <h2 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl">
          Welcome to Solari — let&rsquo;s set up {guildName}
        </h2>
        <p className="mt-2 max-w-2xl text-pretty text-sm text-white/65 sm:text-base">
          Pick a starting point and we&rsquo;ll turn on a sensible bundle of modules with smart
          defaults. You can fine-tune everything below afterward — nothing here is permanent.
        </p>

        <div className="mt-6 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {SETUP_PRESETS.map((preset) => {
            const Icon = PRESET_ICONS[preset.icon];
            const isActive = active === preset.key;
            return (
              <SpotlightCard key={preset.key} className="glass rounded-2xl">
                <button
                  type="button"
                  onClick={() => apply(preset.key)}
                  disabled={pending}
                  className={cn(
                    'flex h-full w-full flex-col gap-3 rounded-2xl p-4 text-left transition-colors',
                    'hover:bg-white/[0.04] disabled:cursor-not-allowed',
                    pending && !isActive && 'opacity-50',
                  )}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-strong)]/25 text-[var(--color-brand)] ring-1 ring-[var(--color-brand)]/25">
                    {isActive ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </span>
                  <div>
                    <p className="text-base font-semibold text-white">{preset.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/55">{preset.tagline}</p>
                  </div>
                </button>
              </SpotlightCard>
            );
          })}
        </div>

        <button
          type="button"
          onClick={skip}
          disabled={pending}
          className="mt-4 text-sm font-medium text-white/50 transition-colors hover:text-white/80 disabled:opacity-50"
        >
          Skip for now — I&rsquo;ll configure modules myself
        </button>
      </div>
    </section>
  );
}
