import Link from 'next/link';
import {
  fetchRefxNodes,
  fetchRefxStatus,
  nodeMetricsLine,
  refxStatusEmoji,
  type RefxNodeMetrics,
  type RefxStatus,
} from '@solari/shared';
import { GlassCard } from '../../components/ui/glass-card';
import { fetchShardStatuses, formatUptime } from '../../lib/bot-status';

export const dynamic = 'force-dynamic';

const STATUS_URL = process.env.REFX_STATUS_URL;

export default async function StatusPage() {
  const shards = await fetchShardStatuses();
  const totalGuilds = shards?.reduce((sum, shard) => sum + shard.guilds, 0) ?? 0;

  let status: RefxStatus | null = null;
  try {
    status = await fetchRefxStatus(STATUS_URL);
  } catch {
    status = null;
  }

  // Best-effort authenticated metrics overlay (server-side token only).
  let metricsByRegion: Map<string, Map<string, RefxNodeMetrics>> | null = null;
  try {
    const nodes = await fetchRefxNodes(process.env.REFX_STATUS_TOKEN, process.env.REFX_NODES_URL);
    if (nodes) {
      metricsByRegion = new Map(
        nodes.data.regions.map((region) => [
          region.code,
          new Map(region.nodes.map((node) => [node.name, node])),
        ]),
      );
    }
  } catch {
    metricsByRegion = null;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Status</h1>
        <Link href="/" className="text-sm text-white/50 hover:text-white/80">
          ← Home
        </Link>
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-white/80">Solari Bot</h2>
        {shards === null ? (
          <GlassCard className="p-5 text-sm text-white/50">
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
                <div
                  key={shard.shardId}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="font-mono text-white/70">Shard {shard.shardId}</span>
                  <span className="font-mono text-xs text-white/40">
                    {shard.ping >= 0 ? `${shard.ping}ms` : '—'} ·{' '}
                    {shard.guilds.toLocaleString()} servers · up {formatUptime(shard.uptimeMs)}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </section>

      <h2 className="mb-2 text-sm font-semibold text-white/80">ReFx Hosting</h2>
      {!status ? (
        <GlassCard className="p-10 text-center text-sm text-white/50">
          The status API is unavailable right now.
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-6">
          <GlassCard className="p-5">
            <p className="text-lg">
              {refxStatusEmoji(status.data.status)} Overall:{' '}
              <span className="font-semibold">{status.data.status}</span>
            </p>
            {status.data.updatedAt && (
              <p className="mt-1 font-mono text-xs text-white/40">
                Updated {new Date(status.data.updatedAt).toLocaleString()}
              </p>
            )}
          </GlassCard>

          {status.data.components.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-white/80">Services</h2>
              <GlassCard className="divide-y divide-white/5 p-0">
                {status.data.components.map((component) => (
                  <div
                    key={component.key}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <span className="text-white/85">{component.name}</span>
                    <span>
                      {refxStatusEmoji(component.status)} {component.status}
                    </span>
                  </div>
                ))}
              </GlassCard>
            </section>
          )}

          {status.data.regions.map((region) => (
            <section key={region.code}>
              <h2 className="mb-2 flex items-center justify-between text-sm font-semibold text-white/80">
                <span>
                  {refxStatusEmoji(region.status)} {region.name}
                </span>
                <span className="font-mono text-xs text-white/40">
                  {region.nodesUp}/{region.nodesTotal} nodes up
                </span>
              </h2>
              <GlassCard className="divide-y divide-white/5 p-0">
                {region.nodes.map((node) => {
                  const metric = metricsByRegion?.get(region.code)?.get(node.name);
                  const summary = metric ? nodeMetricsLine(metric) : '';
                  return (
                    <div
                      key={node.name}
                      className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                    >
                      <span className="font-mono text-white/70">{node.name}</span>
                      <span className="flex items-center gap-3">
                        {summary && (
                          <span className="font-mono text-xs text-white/40">{summary}</span>
                        )}
                        {refxStatusEmoji(node.status)}
                      </span>
                    </div>
                  );
                })}
              </GlassCard>
            </section>
          ))}

          {status.data.incidents.active.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-[var(--color-warning)]">
                Active incidents
              </h2>
              <GlassCard className="flex flex-col gap-2 p-4 text-sm text-white/80">
                {status.data.incidents.active.map((incident, index) => (
                  <p key={incident.id ?? index}>
                    • {incident.title ?? incident.status ?? 'Incident'}
                  </p>
                ))}
              </GlassCard>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
