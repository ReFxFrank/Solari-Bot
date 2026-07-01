import { prisma } from '@solari/database';
import { guardOwnerPage } from '../../lib/auth-guards';
import {
  AdminPanel,
  StatCard,
  type BlacklistEntry,
  type PremiumGuild,
} from '../../components/admin-panel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // Redirects non-owners (and signed-out users) to home before any query runs.
  await guardOwnerPage();

  const [totalServers, premiumServers, blacklistedCount, premiumGuilds, blacklistRows] =
    await Promise.all([
      prisma.guild.count(),
      prisma.guild.count({ where: { premiumTier: 'PREMIUM' } }),
      prisma.blacklist.count(),
      prisma.guild.findMany({
        where: { premiumTier: 'PREMIUM' },
        select: { id: true, name: true },
      }),
      prisma.blacklist.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);

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

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white/90">Admin</h1>
        <p className="text-sm text-white/50">Owner-only controls for premium and the blacklist.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total servers" value={totalServers} />
        <StatCard label="Premium servers" value={premiumServers} />
        <StatCard label="Blacklisted" value={blacklistedCount} />
      </div>

      <AdminPanel premiumGuilds={premium} blacklist={blacklist} />
    </main>
  );
}
