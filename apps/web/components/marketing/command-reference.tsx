'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { SlashCommandInfo } from '../../lib/discord-commands';
import { inputClass } from '../ui/form';
import { cn } from '../../lib/utils';

/** Public, searchable command reference (used on /commands). */
export function CommandReference({ commands }: { commands: SlashCommandInfo[] }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.name.includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.subcommands.some((s) => s.name.includes(q) || s.description.toLowerCase().includes(q)),
    );
  }, [commands, query]);

  if (commands.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-sm text-white/40">
        The command list is temporarily unavailable — check back in a minute.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          className={`${inputClass} pl-9`}
          placeholder={`Search ${commands.length} commands…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search commands"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-white/50">No commands match “{query}”.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {visible.map((command) => {
            const hasSubs = command.subcommands.length > 0;
            const isOpen = expanded === command.name;
            return (
              <div key={command.name} className="glass rounded-xl">
                <button
                  type="button"
                  onClick={() => hasSubs && setExpanded(isOpen ? null : command.name)}
                  className={cn(
                    'flex w-full items-center gap-3 p-3.5 text-left',
                    !hasSubs && 'cursor-default',
                  )}
                  aria-expanded={hasSubs ? isOpen : undefined}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-semibold text-[var(--color-brand-bright)]">
                      /{command.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-white/55">{command.description}</p>
                  </div>
                  {hasSubs && (
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-white/35">
                      {command.subcommands.length}
                      <ChevronDown
                        className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
                      />
                    </span>
                  )}
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-1.5 border-t border-white/10 p-3.5 pt-3">
                    {command.subcommands.map((sub) => (
                      <div key={sub.name} className="min-w-0">
                        <p className="truncate font-mono text-xs text-white/80">
                          /{command.name} <span className="text-white/60">{sub.name}</span>
                        </p>
                        <p className="truncate text-[11px] text-white/45">{sub.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
