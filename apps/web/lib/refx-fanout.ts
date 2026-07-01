import { prisma } from '@solari/database';
import {
  refxAlertMatches,
  refxAlertsConfigSchema,
  type RefxAlertData,
  type RefxWebhookEvent,
} from '@solari/shared';
import { publishLiveCommand } from './redis';

/**
 * Deliver a validated ReFx webhook event to every subscribed guild whose
 * filter matches, by publishing one per-guild REFX_ALERT live command (reusing
 * the existing broadcast-and-filter path: each message carries a guildId so
 * only the shard owning that guild posts). Per-guild failures are isolated so
 * one bad row can't sink the whole webhook. Returns the number published.
 */
export async function fanOutRefxEvent(
  event: RefxWebhookEvent,
  body: { timestamp: string; data: RefxAlertData },
): Promise<number> {
  const rows = await prisma.guildModuleConfig.findMany({
    where: { module: 'REFX_ALERTS', enabled: true },
    select: { guildId: true, config: true },
  });

  let count = 0;
  for (const row of rows) {
    const parsed = refxAlertsConfigSchema.safeParse(row.config ?? {});
    if (!parsed.success) continue;
    const config = parsed.data;
    if (!config.channelId) continue;
    if (!refxAlertMatches(config, event, body.data)) continue;
    try {
      await publishLiveCommand(row.guildId, 'REFX_ALERT', {
        event,
        timestamp: body.timestamp,
        channelId: config.channelId,
        data: body.data,
      });
      count += 1;
    } catch {
      // A single guild's publish failure must not fail the webhook response.
    }
  }
  return count;
}
