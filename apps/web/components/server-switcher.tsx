'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LayoutGrid } from 'lucide-react';
import { guildIconUrl, type ManageableGuild } from '../lib/discord';

function GuildIcon({
  id,
  icon,
  name,
  size,
  className,
}: {
  id: string;
  icon: string | null;
  name: string;
  size: number;
  className: string;
}) {
  const url = guildIconUrl(id, icon, size * 2);
  if (url) {
    return <img src={url} alt="" className={className} />;
  }
  return (
    <span className={`${className} flex items-center justify-center bg-white/5 text-xs font-semibold text-white/60`}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function ServerSwitcher({
  currentId,
  current,
  guilds,
}: {
  currentId: string;
  current: { name: string; icon: string | null };
  guilds: ManageableGuild[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Other manageable guilds the user can switch to (exclude the current one).
  const others = useMemo(() => guilds.filter((g) => g.id !== currentId), [guilds, currentId]);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-w-0 items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-2.5 text-left transition-colors hover:bg-white/[0.06]"
      >
        <GuildIcon
          id={currentId}
          icon={current.icon}
          name={current.name}
          size={36}
          className="h-9 w-9 shrink-0 rounded-lg ring-1 ring-white/10"
        />
        <span className="min-w-0 truncate font-semibold leading-tight text-white/90">
          {current.name}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1.5 w-64 overflow-hidden rounded-xl border border-white/10 bg-[var(--color-base-elevated)] shadow-xl">
          {others.length > 0 && (
            <div className="max-h-72 overflow-y-auto py-1">
              {others.map((guild) => (
                <Link
                  key={guild.id}
                  href={`/servers/${guild.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-white/85 transition-colors hover:bg-white/[0.06]"
                >
                  <GuildIcon
                    id={guild.id}
                    icon={guild.icon}
                    name={guild.name}
                    size={28}
                    className="h-7 w-7 shrink-0 rounded-lg ring-1 ring-white/10"
                  />
                  <span className="min-w-0 truncate">{guild.name}</span>
                </Link>
              ))}
            </div>
          )}
          <div className="border-t border-white/10 p-1">
            <Link
              href="/servers"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white/90"
            >
              <LayoutGrid className="h-4 w-4 shrink-0 text-white/40" />
              All servers
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
