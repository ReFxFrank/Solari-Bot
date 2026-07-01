import { notFound } from 'next/navigation';
import { prisma } from '@solari/database';
import { moderationConfigSchema } from '@solari/shared';
import { guardGuildAccess } from '../../../../lib/auth-guards';
import { getGuildRoles } from '../../../../lib/discord-guild';
import { SettingsForm } from '../../../../components/settings-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await guardGuildAccess(id);

  const [guild, moderationRow, roles] = await Promise.all([
    prisma.guild.findUnique({
      where: { id },
      select: { locale: true, timezone: true, prefix: true },
    }),
    prisma.guildModuleConfig.findUnique({
      where: { guildId_module: { guildId: id, module: 'MODERATION' } },
      select: { config: true },
    }),
    getGuildRoles(id),
  ]);
  if (!guild) notFound();

  const moderation = moderationConfigSchema.parse(moderationRow?.config ?? {});

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-white/90">Server settings</h2>
        <p className="text-sm text-white/50">
          Bot masters, language, timezone, and legacy prefix.
        </p>
      </div>
      <SettingsForm
        guildId={id}
        initialSettings={{ locale: guild.locale, timezone: guild.timezone, prefix: guild.prefix }}
        initialModeration={moderation}
        roles={roles}
      />
    </div>
  );
}
