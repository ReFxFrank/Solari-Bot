import type { Metadata } from 'next';
import { BRAND } from '@solari/shared';
import { getApplicationCommands } from '../../lib/discord-commands';
import { SiteNav } from '../../components/marketing/site-nav';
import { SiteFooter } from '../../components/marketing/site-footer';
import { CommandReference } from '../../components/marketing/command-reference';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Commands',
  description: `Every ${BRAND.name} slash command — moderation, leveling, economy, giveaways, music and more, with all subcommands.`,
};

export default async function CommandsPage() {
  // Failure and "none registered" render the same public fallback message.
  const commands = (await getApplicationCommands()) ?? [];

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-6 py-14">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Commands</h1>
        <p className="mt-3 max-w-2xl text-white/60">
          Everything {BRAND.name} can do from Discord — {commands.length} slash commands, live from
          the bot. Most are also configurable from the dashboard, and server admins can turn any
          command off per-server.
        </p>
        <div className="mt-8">
          <CommandReference commands={commands} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
