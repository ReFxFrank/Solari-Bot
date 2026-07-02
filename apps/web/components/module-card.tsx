import Link from 'next/link';
import { ArrowRight, Crown, Lock } from 'lucide-react';
import { MODULE_ACCENTS, type ModuleMeta } from '../lib/modules';
import { cn } from '../lib/utils';
import { ModuleToggle } from './module-toggle';
import { SpotlightCard } from './marketing/spotlight-card';

export function ModuleCard({
  guildId,
  meta,
  enabled,
  locked = false,
}: {
  guildId: string;
  meta: ModuleMeta;
  enabled: boolean;
  /** Premium module while the guild is on the free tier. */
  locked?: boolean;
}) {
  const Icon = meta.icon;
  // Locked/premium tiles use the reserved gold; everything else its category accent.
  const [from, to] = locked ? MODULE_ACCENTS.gold : MODULE_ACCENTS[meta.accent];
  const glow = from;

  return (
    // SpotlightCard adds the marketing pages' pointer-tracking glow so the
    // dashboard grid shares the same motion language.
    <SpotlightCard
      className={cn(
        'group glass relative flex flex-col gap-3.5 overflow-hidden rounded-2xl p-5 transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-white/20',
        locked && 'border-[var(--color-premium)]/20',
      )}
    >
      {/* Soft accent wash bleeding from the corner — the thing that makes the grid feel alive. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
        style={{ background: glow }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
            !enabled && !locked && 'opacity-55 saturate-50 group-hover:opacity-90 group-hover:saturate-100',
          )}
          style={{
            background: `linear-gradient(140deg, ${from}, ${to})`,
            boxShadow: `0 10px 22px -10px ${glow}80`,
          }}
        >
          {locked ? (
            <Lock className="h-5 w-5 text-black/75" />
          ) : (
            <Icon className="h-[22px] w-[22px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
          )}
        </span>

        {locked ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-premium)]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-premium)]">
            <Crown className="h-3 w-3" /> Premium
          </span>
        ) : (
          <ModuleToggle
            guildId={guildId}
            module={meta.module}
            initialEnabled={enabled}
            label={meta.name}
          />
        )}
      </div>

      <div className="relative min-w-0">
        <h3 className="font-semibold text-white/90">{meta.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-snug text-white/55">{meta.description}</p>
      </div>

      <div className="relative mt-auto flex items-center justify-between gap-2 pt-1">
        {locked ? (
          <StatusChip tone="premium" label="Locked" />
        ) : enabled ? (
          <StatusChip tone="on" label="Active" />
        ) : (
          <StatusChip tone="off" label="Disabled" />
        )}

        {locked ? (
          <Link
            href={`/servers/${guildId}/premium`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-premium)] transition-transform hover:translate-x-0.5"
          >
            Unlock <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : meta.configSlug ? (
          <Link
            href={`/servers/${guildId}/${meta.configSlug}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-bright)] transition-transform hover:translate-x-0.5"
          >
            Configure <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </SpotlightCard>
  );
}

function StatusChip({ tone, label }: { tone: 'on' | 'off' | 'premium'; label: string }) {
  const dot =
    tone === 'on'
      ? 'bg-[var(--color-success)] shadow-[0_0_8px_var(--color-success)]'
      : tone === 'premium'
        ? 'bg-[var(--color-premium)]'
        : 'bg-white/25';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/60">
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      {label}
    </span>
  );
}
