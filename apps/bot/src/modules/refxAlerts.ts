import type { Client } from 'discord.js';
import {
  buildRefxAlert,
  refxAlertShouldMention,
  type RefxAlertData,
  type RefxAlertPayload,
} from '@solari/shared';
import { brandedEmbed } from '../lib/embeds';
import type { ConfigCache } from '../services/configCache';
import type { Logger } from '../logger';

/**
 * Post a ReFx status/incident alert into a guild's configured channel. The web
 * receiver already matched this guild's subscription, but we re-check the live
 * cached config (defense-in-depth) so a just-disabled/retargeted subscription
 * is honored. All send failures are swallowed — Redis pub/sub is fire-and-forget.
 */
export async function postRefxAlert(
  client: Client,
  config: ConfigCache,
  logger: Logger,
  guildId: string,
  payload: RefxAlertPayload,
): Promise<void> {
  if (!(await config.isEnabled(guildId, 'REFX_ALERTS'))) return;
  const settings = await config.getConfig(guildId, 'REFX_ALERTS');
  if (!settings.channelId) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  const channel =
    guild.channels.cache.get(settings.channelId) ??
    (await guild.channels.fetch(settings.channelId).catch(() => null));
  if (!channel || !channel.isTextBased() || channel.isDMBased()) return;

  const data = (payload.data ?? {}) as RefxAlertData;
  const content = buildRefxAlert(payload.event, data);
  const embed = brandedEmbed({
    kind: content.kind,
    title: content.title.slice(0, 256),
    description: content.description.slice(0, 4000) || undefined,
  });
  if (data.url) embed.setURL(data.url);
  const when = new Date(payload.timestamp);
  if (!Number.isNaN(when.getTime())) embed.setTimestamp(when);

  const mentionRoleId = refxAlertShouldMention(settings, data) ? settings.mentionRoleId : null;
  await channel
    .send({
      content: mentionRoleId ? `<@&${mentionRoleId}>` : undefined,
      embeds: [embed],
      allowedMentions: mentionRoleId ? { roles: [mentionRoleId] } : { parse: [] },
    })
    .catch((err: unknown) => logger.warn({ err, guildId }, 'ReFx alert post failed'));
}
