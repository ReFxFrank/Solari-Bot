import { prisma } from '@helios/database';
import { ticketsConfigSchema } from '@helios/shared';
import { guardGuildAccess } from '../../../../lib/auth-guards';
import { TicketsForm } from '../../../../components/tickets-form';
import { GlassCard } from '../../../../components/ui/glass-card';

export const dynamic = 'force-dynamic';

export default async function TicketsConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await guardGuildAccess(id);

  const [row, openCount] = await Promise.all([
    prisma.guildModuleConfig.findUnique({
      where: { guildId_module: { guildId: id, module: 'TICKETS' } },
      select: { config: true },
    }),
    prisma.ticket.count({ where: { guildId: id, status: 'OPEN' } }),
  ]);
  const initial = ticketsConfigSchema.parse(row?.config ?? {});

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-white/90">Tickets</h2>
        <p className="text-sm text-white/50">
          Private support channels with transcripts and inactivity auto-close.{' '}
          <span className="font-mono text-white/40">{openCount} open</span>
        </p>
      </div>
      <GlassCard className="p-5">
        <TicketsForm guildId={id} initial={initial} />
      </GlassCard>
    </div>
  );
}
