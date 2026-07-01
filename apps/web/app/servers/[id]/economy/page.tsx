import { prisma } from '@solari/database';
import { economyConfigSchema } from '@solari/shared';
import { guardGuildAccess } from '../../../../lib/auth-guards';
import { getGuildEntities } from '../../../../lib/discord-guild';
import { EconomyForm } from '../../../../components/economy-form';

export const dynamic = 'force-dynamic';

export default async function EconomyConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await guardGuildAccess(id);

  const [row, { roles }] = await Promise.all([
    prisma.guildModuleConfig.findUnique({
      where: { guildId_module: { guildId: id, module: 'ECONOMY' } },
      select: { config: true },
    }),
    getGuildEntities(id),
  ]);
  const initial = economyConfigSchema.parse(row?.config ?? {});

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-white/90">Economy</h2>
        <p className="text-sm text-white/50">
          Currency, income, rob, and the server shop. Saved changes reach the bot in ~1s.
        </p>
      </div>
      <EconomyForm guildId={id} initial={initial} roles={roles} />
    </div>
  );
}
