import { prisma } from '@solari/database';
import { welcomeConfigSchema } from '@solari/shared';
import { guardGuildAccess } from '../../../../lib/auth-guards';
import { WelcomeForm } from '../../../../components/welcome-form';
import { GlassCard } from '../../../../components/ui/glass-card';

export const dynamic = 'force-dynamic';

export default async function WelcomeConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await guardGuildAccess(id);

  const row = await prisma.guildModuleConfig.findUnique({
    where: { guildId_module: { guildId: id, module: 'WELCOME' } },
    select: { config: true },
  });
  const initial = welcomeConfigSchema.parse(row?.config ?? {});

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-white/90">Welcome &amp; Leave</h2>
        <p className="text-sm text-white/50">
          Greet new members and announce departures. Saved changes reach the bot in ~1s.
        </p>
      </div>
      <GlassCard className="p-5">
        <WelcomeForm guildId={id} initial={initial} />
      </GlassCard>
    </div>
  );
}
