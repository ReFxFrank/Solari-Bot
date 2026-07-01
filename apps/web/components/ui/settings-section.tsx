'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { GlassCard } from './glass-card';

/**
 * MEE6-style collapsible settings section: a card with a title, one-line
 * description, and a body that expands/collapses. Defaults to expanded.
 */
export function SettingsSection({
  title,
  description,
  defaultOpen = true,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <GlassCard>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left outline-none"
      >
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold text-white/90">{title}</span>
          <span className="text-sm text-white/50">{description}</span>
        </div>
        <ChevronDown
          className={cn(
            'mt-1 h-5 w-5 shrink-0 text-white/40 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && <div className="border-t border-white/10 px-5 py-5">{children}</div>}
    </GlassCard>
  );
}
