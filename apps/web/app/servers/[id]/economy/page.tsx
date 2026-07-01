import { prisma } from '@solari/database';
import { economyConfigSchema } from '@solari/shared';
import { guardGuildAccess } from '../../../../lib/auth-guards';
import { EconomyForm } from '../../../../components/economy-form';
import { GlassCard } from '../../../../components/ui/glass-card';

export const dynamic = 'force-dynamic';

export default async function EconomyConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await guardGuildAccess(id);

  const row = await prisma.guildModuleConfig.findUnique({
    where: { guildId_module: { guildId: id, module: 'ECONOMY' } },
    select: { config: true },
  });
  const initial = economyConfigSchema.parse(row?.config ?? {});

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-white/90">Economy</h2>
        <p className="text-sm text-white/50">
          Currency, earning, and gambling limits. Saved changes reach the bot in ~1s.
        </p>
      </div>
      <GlassCard className="p-5">
        <EconomyForm guildId={id} initial={initial} />
      </GlassCard>
    </div>
  );
}
