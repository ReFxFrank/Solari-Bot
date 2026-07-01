import Link from 'next/link';
import { ArrowRight, Crown } from 'lucide-react';
import type { ModuleMeta } from '../lib/modules';
import { cn } from '../lib/utils';
import { GlassCard } from './ui/glass-card';
import { ModuleToggle } from './module-toggle';

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
  return (
    <GlassCard
      className={cn(
        'flex flex-col gap-3 p-4 transition-all hover:border-white/15',
        !enabled && !locked && 'opacity-70',
        locked && 'border-[var(--color-premium)]/20',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            locked
              ? 'bg-[var(--color-premium)]/12 text-[var(--color-premium)]'
              : enabled
                ? 'bg-[var(--color-brand)]/15 text-[var(--color-brand-bright)]'
                : 'bg-white/5 text-white/50',
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-medium text-white/90">{meta.name}</h3>
            {locked ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-premium)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-premium)]">
                <Crown className="h-3 w-3" /> PREMIUM
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
          <p className="mt-0.5 text-xs text-white/50">{meta.description}</p>
        </div>
      </div>

      {locked ? (
        <Link
          href={`/servers/${guildId}/premium`}
          className="inline-flex items-center gap-1 self-start text-xs font-semibold text-[var(--color-premium)] hover:underline"
        >
          Unlock with Premium <ArrowRight className="h-3 w-3" />
        </Link>
      ) : (
        meta.configSlug && (
          <Link
            href={`/servers/${guildId}/${meta.configSlug}`}
            className="inline-flex items-center gap-1 self-start text-xs font-medium text-[var(--color-brand-bright)] hover:underline"
          >
            Configure <ArrowRight className="h-3 w-3" />
          </Link>
        )
      )}
    </GlassCard>
  );
}
