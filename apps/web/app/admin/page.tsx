import { prisma } from '@solari/database';
import { guardOwnerPage } from '../../lib/auth-guards';
import { MODULE_META } from '../../lib/modules';
import { GlassCard } from '../../components/ui/glass-card';
import {
  AdminPanel,
  StatCard,
  type BlacklistEntry,
  type PremiumGuild,
} from '../../components/admin-panel';

interface GlobalAuditEntry {
  id: string;
  guildId: string;
  guildName: string | null;
  userId: string;
  action: string;
  module: string | null;
  createdAt: string;
}

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // Redirects non-owners (and signed-out users) to home before any query runs.
  await guardOwnerPage();

  const [
    totalServers,
    premiumServers,
    blacklistedCount,
    premiumGuilds,
    blacklistRows,
    flagRows,
    auditRows,
  ] = await Promise.all([
    prisma.guild.count(),
    prisma.guild.count({ where: { premiumTier: 'PREMIUM' } }),
    prisma.blacklist.count(),
    prisma.guild.findMany({
      where: { premiumTier: 'PREMIUM' },
      select: { id: true, name: true },
    }),
    prisma.blacklist.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.globalModuleFlag.findMany({ select: { module: true, enabled: true } }),
    // Global audit trail across every guild — owner-only surface. Dashboard
    // changes are still recorded per guild; clients have no audit page.
    prisma.dashboardAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { guild: { select: { name: true } } },
    }),
  ]);

  const features = MODULE_META.map((meta) => ({ module: meta.module, name: meta.name }));
  const disabledModules = (flagRows as { module: string; enabled: boolean }[])
    .filter((flag) => !flag.enabled)
    .map((flag) => flag.module);

  const premium: PremiumGuild[] = (premiumGuilds as { id: string; name: string | null }[]).map(
    (guild) => ({ id: guild.id, name: guild.name }),
  );
  const blacklist: BlacklistEntry[] = (
    blacklistRows as {
      id: string;
      type: 'GUILD' | 'USER';
      targetId: string;
      reason: string | null;
      createdAt: Date;
    }[]
  ).map((entry) => ({
    id: entry.id,
    type: entry.type,
    targetId: entry.targetId,
    reason: entry.reason,
    createdAt: entry.createdAt.toISOString(),
  }));

  const auditEntries: GlobalAuditEntry[] = (
    auditRows as {
      id: string;
      guildId: string;
      userId: string;
      action: string;
      module: string | null;
      createdAt: Date;
      guild: { name: string | null } | null;
    }[]
  ).map((entry) => ({
    id: entry.id,
    guildId: entry.guildId,
    guildName: entry.guild?.name ?? null,
    userId: entry.userId,
    action: entry.action,
    module: entry.module,
    createdAt: entry.createdAt.toISOString().replace('T', ' ').slice(0, 16),
  }));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white/90">Admin</h1>
          <p className="text-sm text-white/50">Owner-only controls for premium and the blacklist.</p>
        </div>
        <a
          href="/admin/incidents"
          className="rounded-lg border border-white/10 px-3.5 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          📣 Incidents
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total servers" value={totalServers} />
        <StatCard label="Premium servers" value={premiumServers} />
        <StatCard label="Blacklisted" value={blacklistedCount} />
      </div>

      <AdminPanel
        premiumGuilds={premium}
        blacklist={blacklist}
        features={features}
        disabledModules={disabledModules}
      />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white/90">Global audit log</h2>
          <p className="text-sm text-white/50">
            Every dashboard change across all servers, most recent first. Owner-only — clients only
            see their own server&apos;s log.
          </p>
        </div>
        {auditEntries.length === 0 ? (
          <GlassCard className="p-10 text-center text-sm text-white/40">
            No changes recorded yet.
          </GlassCard>
        ) : (
          <GlassCard className="divide-y divide-white/5 p-0">
            {auditEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
              >
                <span className="font-medium text-white/85">{entry.action}</span>
                {entry.module && (
                  <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-white/50">
                    {entry.module}
                  </span>
                )}
                <span className="truncate text-xs text-white/50">
                  {entry.guildName ?? 'Unknown'}{' '}
                  <span className="font-mono text-white/30">({entry.guildId})</span>
                </span>
                <span className="font-mono text-xs text-white/40">by {entry.userId}</span>
                <span className="ml-auto text-xs text-white/30">{entry.createdAt}</span>
              </div>
            ))}
          </GlassCard>
        )}
      </section>
    </main>
  );
}
