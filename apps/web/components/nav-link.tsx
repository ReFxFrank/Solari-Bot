'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Crown, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

export function NavLink({
  href,
  label,
  icon,
  premium,
  locked,
}: {
  href: string;
  label: string;
  /**
   * Pre-rendered icon element. It must be rendered on the server (pass `<Icon />`,
   * not the `Icon` component) — React cannot serialize a component/function across
   * the server→client boundary. The icon inherits its color from this component
   * via `currentColor`, so callers should not set a text color on it.
   */
  icon?: ReactNode;
  /** Gold treatment for the Premium entry. */
  premium?: boolean;
  /** Show a lock (premium module, guild not on Premium). */
  locked?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
        premium
          ? 'font-medium text-[var(--color-premium)] hover:bg-[var(--color-premium)]/10'
          : active
            ? 'bg-white/[0.07] font-medium text-white'
            : 'text-white/55 hover:bg-white/[0.04] hover:text-white/85',
      )}
    >
      {active && !premium && (
        <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-[var(--color-brand)]" />
      )}
      {premium ? (
        <Crown className="h-4 w-4 shrink-0" />
      ) : (
        icon && (
          <span
            className={cn(
              'inline-flex shrink-0 transition-colors',
              active ? 'text-[var(--color-brand-bright)]' : 'text-white/40 group-hover:text-white/70',
            )}
          >
            {icon}
          </span>
        )
      )}
      <span className="truncate">{label}</span>
      {locked && <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-[var(--color-premium)]/70" />}
    </Link>
  );
}
