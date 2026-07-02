import Link from 'next/link';
import { GlassCard } from '../../components/ui/glass-card';
import { fetchShardStatuses, formatUptime } from '../../lib/bot-status';

export const dynamic = 'force-dynamic';

export default async function StatusPage() {
  const shards = await fetchShardStatuses();
  const totalGuilds = shards?.reduce((sum, shard) => sum + shard.guilds, 0) ?? 0;
  const updatedAt = shards?.length
    ? shards.reduce(
        (latest, shard) => (shard.updatedAt > latest ? shard.updatedAt : latest),
        shards[0]!.updatedAt,
      )
    : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Status</h1>
        <Link href="/" className="text-sm text-white/50 hover:text-white/80">
          ← Home
        </Link>
      </div>

      {shards === null ? (
        <GlassCard className="p-10 text-center text-sm text-white/50">
          ⚪ Bot status is unavailable right now.
        </GlassCard>
      ) : shards.length === 0 ? (
        <GlassCard className="p-5">
          <p className="text-lg">
            🔴 <span className="font-semibold">Offline</span>
          </p>
          <p className="mt-1 text-xs text-white/40">No shard has reported in the last 90s.</p>
        </GlassCard>
      ) : (
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-lg">
              🟢 <span className="font-semibold">Operational</span>
            </p>
            <p className="font-mono text-xs text-white/40">
              {totalGuilds.toLocaleString()} servers ·{' '}
              {shards.length === 1 ? '1 shard' : `${shards.length} shards`}
            </p>
          </div>
          <div className="mt-3 divide-y divide-white/5 border-t border-white/5">
            {shards.map((shard) => (
              <div key={shard.shardId} className="flex items-center justify-between py-2 text-sm">
                <span className="font-mono text-white/70">Shard {shard.shardId}</span>
                <span className="font-mono text-xs text-white/40">
                  {shard.ping >= 0 ? `${shard.ping}ms` : '—'} ·{' '}
                  {shard.guilds.toLocaleString()} servers · up {formatUptime(shard.uptimeMs)}
                </span>
              </div>
            ))}
          </div>
          {updatedAt && (
            <p className="mt-3 font-mono text-xs text-white/30">
              Updated {new Date(updatedAt).toLocaleString()}
            </p>
          )}
        </GlassCard>
      )}
    </main>
  );
}
