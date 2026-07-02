import Link from 'next/link';
import { prisma } from '@solari/database';
import { guardOwnerPage } from '../../../lib/auth-guards';
import { IncidentManager } from '../../../components/incident-manager';
import type { IncidentDTO } from '../../../lib/incidents';

export const dynamic = 'force-dynamic';

export default async function AdminIncidentsPage() {
  await guardOwnerPage();

  const rows = await prisma.incident.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { updates: { orderBy: { createdAt: 'desc' } } },
  });

  const incidents: IncidentDTO[] = rows.map((incident) => ({
    id: incident.id,
    title: incident.title,
    severity: incident.severity,
    status: incident.status,
    component: incident.component,
    createdAt: incident.createdAt.toISOString(),
    resolvedAt: incident.resolvedAt?.toISOString() ?? null,
    updates: incident.updates.map((update) => ({
      id: update.id,
      status: update.status,
      message: update.message,
      createdAt: update.createdAt.toISOString(),
    })),
  }));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white/90">Incidents</h1>
          <p className="text-sm text-white/50">
            Publish and update incidents shown on the public{' '}
            <Link href="/status" className="text-[var(--color-brand-bright)] hover:underline">
              /status
            </Link>{' '}
            page. Owner-only.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-white/50 hover:text-white/80">
          ← Admin
        </Link>
      </div>
      <IncidentManager incidents={incidents} />
    </main>
  );
}
