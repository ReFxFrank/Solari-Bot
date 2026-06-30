import { Routes } from 'discord.js';
import type { TempActionExpireJob } from '@helios/jobs';
import { createModerationCase, deactivateTempBans } from '../../lib/cases';
import type { JobContext } from '../../services/jobs';

/**
 * Reverse an expired temporary action. Uses REST (`client.rest`) rather than
 * cache, so any shard's worker can execute it regardless of which shard owns
 * the guild. Failures (e.g. the user was already manually unbanned) are logged,
 * not thrown, so bookkeeping still completes.
 */
export async function handleTempActionExpire(
  data: TempActionExpireJob,
  ctx: JobContext,
): Promise<void> {
  const { client, logger } = ctx;

  switch (data.type) {
    case 'UNBAN': {
      try {
        await client.rest.delete(Routes.guildBan(data.guildId, data.userId), {
          reason: 'Temporary ban expired',
        });
      } catch (err) {
        logger.warn({ err, ...data }, 'tempActionExpire: unban failed (may already be unbanned)');
      }
      await deactivateTempBans(data.guildId, data.userId);
      await createModerationCase({
        guildId: data.guildId,
        type: 'UNBAN',
        targetId: data.userId,
        moderatorId: client.user?.id ?? 'system',
        reason: 'Temporary ban expired',
      });
      logger.info({ ...data }, 'Temp-ban expired and reversed');
      return;
    }

    case 'UNMUTE': {
      try {
        await client.rest.patch(Routes.guildMember(data.guildId, data.userId), {
          body: { communication_disabled_until: null },
          reason: 'Mute expired',
        });
      } catch (err) {
        logger.warn({ err, ...data }, 'tempActionExpire: unmute failed');
      }
      return;
    }

    case 'TEMPROLE_REMOVE': {
      if (!data.roleId) return;
      try {
        await client.rest.delete(Routes.guildMemberRole(data.guildId, data.userId, data.roleId), {
          reason: 'Temporary role expired',
        });
      } catch (err) {
        logger.warn({ err, ...data }, 'tempActionExpire: temp-role removal failed');
      }
      return;
    }
  }
}
