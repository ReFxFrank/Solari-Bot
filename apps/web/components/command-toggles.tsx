'use client';

import { useMemo, useState, useTransition } from 'react';
import { Search } from 'lucide-react';
import type { SlashCommandInfo } from '../lib/discord-commands';
import { setCommandEnabled } from '../lib/command-toggle-actions';
import { Switch } from './ui/switch';
import { inputClass } from './ui/form';

export function CommandToggles({
  guildId,
  commands,
  initialDisabled,
}: {
  guildId: string;
  commands: SlashCommandInfo[];
  initialDisabled: string[];
}) {
  const [disabled, setDisabled] = useState<Set<string>>(new Set(initialDisabled));
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? commands.filter(
          (c) => c.name.includes(q) || c.description.toLowerCase().includes(q),
        )
      : commands;
  }, [commands, query]);

  function toggle(name: string, enabled: boolean): void {
    setError(null);
    // Optimistic flip; reverted if the server action fails.
    setDisabled((prev) => {
      const next = new Set(prev);
      if (enabled) next.delete(name);
      else next.add(name);
      return next;
    });
    startTransition(async () => {
      const result = await setCommandEnabled(guildId, name, enabled);
      if (!result.ok) {
        setError(result.error ?? 'Could not save.');
        setDisabled((prev) => {
          const next = new Set(prev);
          if (enabled) next.add(name);
          else next.delete(name);
          return next;
        });
      }
    });
  }

  if (commands.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-sm text-white/40">
        Couldn&apos;t load the command list — check that the bot token is configured, then reload.
      </div>
    );
  }

  const enabledCount = commands.length - disabled.size;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search commands"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span className="shrink-0 text-xs text-white/40">
          {enabledCount}/{commands.length} enabled
        </span>
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      {visible.length === 0 ? (
        <p className="text-sm text-white/50">No commands match “{query}”.</p>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {visible.map((command) => {
            const isEnabled = !disabled.has(command.name);
            return (
              <div
                key={command.name}
                className={`glass flex items-center gap-3 rounded-xl p-3 ${isEnabled ? '' : 'opacity-60'}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-medium text-white/90">
                    /{command.name}
                  </p>
                  <p className="truncate text-xs text-white/50">{command.description}</p>
                </div>
                <Switch
                  checked={isEnabled}
                  onChange={(next) => toggle(command.name, next)}
                  label={`Enable /${command.name}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
