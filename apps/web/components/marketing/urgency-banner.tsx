'use client';

import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

/** Live HH:MM:SS remaining until the next midnight — an evergreen "deal ends soon". */
function useMidnightCountdown(): string | null {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const tick = (): void => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      const ms = Math.max(0, end.getTime() - now.getTime());
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      const pad = (n: number): string => String(n).padStart(2, '0');
      setText(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return text;
}

export function UrgencyBanner() {
  const countdown = useMidnightCountdown();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 px-4 py-2 text-center text-sm text-amber-100">
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300" />
      <span>
        <strong className="font-semibold text-amber-200">Launch offer</strong> — 50% off Premium
      </span>
      <span className="hidden sm:inline text-amber-200/60">·</span>
      <span className="hidden items-center gap-1 sm:inline-flex">
        ends in{' '}
        <span className="font-mono tabular-nums font-semibold text-amber-200">
          {countdown ?? '—:—:—'}
        </span>
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-200/50 hover:text-amber-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
