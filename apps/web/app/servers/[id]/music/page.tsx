import { prisma } from '@solari/database';
import { musicConfigSchema } from '@solari/shared';
import { guardGuildAccess } from '../../../../lib/auth-guards';
import { getGuildRoles } from '../../../../lib/discord-guild';
import { MusicForm } from '../../../../components/music-form';
import { GlassCard } from '../../../../components/ui/glass-card';

export const dynamic = 'force-dynamic';

export default async function MusicConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await guardGuildAccess(id);

  const [row, roles] = await Promise.all([
    prisma.guildModuleConfig.findUnique({
      where: { guildId_module: { guildId: id, module: 'MUSIC' } },
      select: { config: true },
    }),
    getGuildRoles(id),
  ]);
  const initial = musicConfigSchema.parse(row?.config ?? {});

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-white/90">Music</h2>
        <p className="text-sm text-white/50">
          DJ roles, queue limits, volume and skip voting. Saved changes reach the bot in ~1s.
        </p>
      </div>
      <GlassCard className="p-5">
        <MusicForm guildId={id} initial={initial} roles={roles} />
      </GlassCard>
    </div>
  );
}
