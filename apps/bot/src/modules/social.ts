import { type Client } from 'discord.js';
import { prisma } from '@solari/database';
import { QUEUE_NAMES } from '@solari/jobs';
import { env } from '../env';
import { brandedEmbed } from '../lib/embeds';
import { fetchLatest, type SocialItem, type SocialPlatform } from '../lib/social';
import type { JobService } from '../services/jobs';
import type { Logger } from '../logger';

/** Poll interval per subscription. Kept modest to respect upstream rate limits. */
const POLL_INTERVAL_MS = 3 * 60 * 1000;
/** Never post more than this many items from a single poll (anti-spam). */
const MAX_POST_PER_POLL = 5;

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
  reddit: 'Reddit',
  rss: 'RSS',
};

function socialJobId(subscriptionId: string): string {
  return `social:${subscriptionId}`;
}

export async function scheduleSocialPoll(
  jobs: JobService,
  subscriptionId: string,
  delayMs: number = POLL_INTERVAL_MS,
): Promise<void> {
  await jobs.schedule(
    QUEUE_NAMES.socialPoll,
    'poll',
    { subscriptionId },
    { jobId: socialJobId(subscriptionId), delayMs },
  );
}

export async function cancelSocialPoll(jobs: JobService, subscriptionId: string): Promise<void> {
  await jobs.cancel(QUEUE_NAMES.socialPoll, socialJobId(subscriptionId));
}

/**
 * Record the current newest item as the baseline (called on /social add) so the
 * first real poll doesn't dump the whole existing feed into the channel.
 */
export async function baselineSubscription(subscriptionId: string): Promise<void> {
  const sub = await prisma.socialSubscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) return;
  const items = await fetchLatest(sub.platform as SocialPlatform, sub.target, env);
  const newest = items[0];
  if (newest) {
    await prisma.socialSubscription.update({
      where: { id: sub.id },
      data: { lastItemId: newest.id },
    });
  }
}

interface PollDeps {
  client: Client;
  logger: Logger;
  jobs: JobService;
}

/** Poll one subscription, post new items, then re-arm its own job. */
export async function pollSubscription(subscriptionId: string, deps: PollDeps): Promise<void> {
  const sub = await prisma.socialSubscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) return; // deleted → let the loop die

  // Job context has no ConfigCache, so check enablement directly. Keep the loop
  // armed while disabled so re-enabling takes effect without a bot restart.
  const cfg = await prisma.guildModuleConfig.findUnique({
    where: { guildId_module: { guildId: sub.guildId, module: 'SOCIAL' } },
    select: { enabled: true },
  });
  if (!cfg?.enabled) {
    await scheduleSocialPoll(deps.jobs, subscriptionId);
    return;
  }

  try {
    const items = await fetchLatest(sub.platform as SocialPlatform, sub.target, env);
    if (items.length > 0) {
      const newest = items[0];
      if (!sub.lastItemId) {
        // First poll with no baseline — set it, post nothing.
        if (newest) {
          await prisma.socialSubscription.update({
            where: { id: sub.id },
            data: { lastItemId: newest.id },
          });
        }
      } else {
        const seenIndex = items.findIndex((i) => i.id === sub.lastItemId);
        // Unseen items are those before the last seen one; if it aged out of the
        // feed, treat all as new but cap the burst.
        const fresh = (seenIndex === -1 ? items : items.slice(0, seenIndex)).slice(0, MAX_POST_PER_POLL);
        if (fresh.length > 0) {
          await postItems(deps, sub.channelId, sub.mentionRoleId, sub.platform as SocialPlatform, fresh);
        }
        if (newest && newest.id !== sub.lastItemId) {
          await prisma.socialSubscription.update({
            where: { id: sub.id },
            data: { lastItemId: newest.id },
          });
        }
      }
    }
  } catch (err) {
    deps.logger.warn({ err, subscriptionId }, 'Social poll failed');
  } finally {
    await scheduleSocialPoll(deps.jobs, subscriptionId);
  }
}

async function postItems(
  deps: PollDeps,
  channelId: string,
  mentionRoleId: string | null,
  platform: SocialPlatform,
  itemsNewestFirst: SocialItem[],
): Promise<void> {
  const channel =
    deps.client.channels.cache.get(channelId) ??
    (await deps.client.channels.fetch(channelId).catch(() => null));
  if (!channel?.isTextBased() || channel.isDMBased()) return;

  const mention = mentionRoleId ? `<@&${mentionRoleId}>` : undefined;
  // Post oldest-first so the channel reads chronologically.
  for (const item of [...itemsNewestFirst].reverse()) {
    const embed = brandedEmbed({ kind: 'info' })
      .setTitle(item.title.slice(0, 256))
      .setAuthor({ name: `${PLATFORM_LABEL[platform]}${item.author ? ` • ${item.author}` : ''}` });
    if (item.url) embed.setURL(item.url);
    await channel
      .send({
        content: mention,
        embeds: [embed],
        allowedMentions: { roles: mentionRoleId ? [mentionRoleId] : [] },
      })
      .catch(() => undefined);
  }
}

/** Re-arm every subscription's poll job on startup (arm-if-absent). */
export async function reconcileSocial(
  client: Client,
  jobs: JobService,
  logger: Logger,
): Promise<void> {
  const guildIds = [...client.guilds.cache.keys()];
  if (guildIds.length === 0) return;
  const subs = await prisma.socialSubscription.findMany({
    where: { guildId: { in: guildIds } },
    select: { id: true },
  });
  let i = 0;
  for (const sub of subs) {
    await jobs.ensureScheduled(
      QUEUE_NAMES.socialPoll,
      'poll',
      { subscriptionId: sub.id },
      { jobId: socialJobId(sub.id), delayMs: 5_000 + (i % 30) * 4_000 },
    );
    i += 1;
  }
  logger.info({ count: subs.length }, 'Reconciled social subscriptions');
}
