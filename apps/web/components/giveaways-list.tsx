'use client';

import { useTransition } from 'react';
import { Dices, Square } from 'lucide-react';
import { endGiveawayAction, rerollGiveawayAction } from '../lib/giveaway-actions';
import { GlassCard } from './ui/glass-card';

export interface GiveawaySummary {
  id: string;
  prize: string;
  winnerCount: number;
  entryCount: number;
  ended: boolean;
  endsAt: string;
}

export function GiveawaysList({
  guildId,
  giveaways,
}: {
  guildId: string;
  giveaways: GiveawaySummary[];
}) {
  const [pending, startTransition] = useTransition();

  function end(id: string): void {
    startTransition(async () => {
      await endGiveawayAction(guildId, id);
    });
  }
  function reroll(id: string): void {
    startTransition(async () => {
      await rerollGiveawayAction(guildId, id);
    });
  }

  if (giveaways.length === 0) {
    return (
      <GlassCard className="p-10 text-center text-sm text-white/40">
        No giveaways yet. Start one in Discord with{' '}
        <code className="font-mono">/giveaway start</code>.
      </GlassCard>
    );
  }

  return (
    <GlassCard className="divide-y divide-white/5 p-0">
      {giveaways.map((giveaway) => (
        <div key={giveaway.id} className="flex items-center gap-3 px-4 py-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-white/90">{giveaway.prize}</p>
            <p className="font-mono text-xs text-white/40">
              {giveaway.winnerCount} winner{giveaway.winnerCount > 1 ? 's' : ''} ·{' '}
              {giveaway.entryCount} entries ·{' '}
              {giveaway.ended
                ? 'ended'
                : `ends ${new Date(giveaway.endsAt).toISOString().slice(0, 16).replace('T', ' ')}`}
            </p>
          </div>
          {!giveaway.ended && (
            <button
              type="button"
              onClick={() => end(giveaway.id)}
              disabled={pending}
              title="End now"
              className="rounded-md border border-white/10 p-1.5 text-white/60 hover:text-white disabled:opacity-40"
            >
              <Square className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => reroll(giveaway.id)}
            disabled={pending}
            title="Reroll winners"
            className="rounded-md border border-white/10 p-1.5 text-white/60 hover:text-white disabled:opacity-40"
          >
            <Dices className="h-4 w-4" />
          </button>
        </div>
      ))}
    </GlassCard>
  );
}
