'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Dashboard sidebar wrapper. On md+ the children render as the always-visible
 * sticky sidebar column, unchanged. On phones the full module nav would push
 * every page's content below ~30 links, so it collapses behind a Menu button
 * (inline accordion — no overlay to fight the portal dropdowns) and closes
 * itself after navigation.
 */
export function MobileSidebar({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="glass flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium text-white/85 md:hidden"
      >
        <span className="flex items-center gap-2">
          <Menu className="h-4 w-4 text-white/50" /> Menu
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-white/40 transition-transform', open && 'rotate-180')}
        />
      </button>
      <div className={cn('flex-col gap-4', open ? 'flex' : 'hidden md:flex')}>{children}</div>
    </>
  );
}
