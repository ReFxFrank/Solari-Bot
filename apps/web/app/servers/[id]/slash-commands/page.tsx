import { prisma } from '@solari/database';
import { guardGuildAccess } from '../../../../lib/auth-guards';
import { getApplicationCommands } from '../../../../lib/discord-commands';
import { CommandToggles } from '../../../../components/command-toggles';

export const dynamic = 'force-dynamic';

export default async function SlashCommandsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await guardGuildAccess(id);

  const [commands, guild] = await Promise.all([
    getApplicationCommands(),
    prisma.guild.findUnique({ where: { id }, select: { disabledCommands: true } }),
  ]);
  const disabled = guild?.disabledCommands ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-white/90">Slash Commands</h2>
        <p className="text-sm text-white/50">
          Turn individual commands on or off for this server. A disabled command refuses everyone —
          moderators included — within ~1s of the change.
        </p>
      </div>
      <CommandToggles guildId={id} commands={commands} initialDisabled={disabled} />
    </div>
  );
}
