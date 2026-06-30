import { prisma } from '@helios/database';
import { starboardConfigSchema } from '@helios/shared';
import { guardGuildAccess } from '../../../../lib/auth-guards';
import { StarboardForm } from '../../../../components/starboard-form';
import { GlassCard } from '../../../../components/ui/glass-card';

export const dynamic = 'force-dynamic';

export default async function StarboardConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await guardGuildAccess(id);

  const row = await prisma.guildModuleConfig.findUnique({
    where: { guildId_module: { guildId: id, module: 'STARBOARD' } },
    select: { config: true },
  });
  const initial = starboardConfigSchema.parse(row?.config ?? {});

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-white/90">Starboard</h2>
        <p className="text-sm text-white/50">Highlight messages that reach a star threshold.</p>
      </div>
      <GlassCard className="p-5">
        <StarboardForm guildId={id} initial={initial} />
      </GlassCard>
    </div>
  );
}
