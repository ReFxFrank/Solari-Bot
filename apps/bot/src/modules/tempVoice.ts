import {
  ChannelType,
  type Client,
  type GuildMember,
  type VoiceBasedChannel,
  type VoiceState,
} from 'discord.js';
import type { PrismaClient } from '@solari/database';
import type { TempVoiceConfig } from '@solari/shared';
import type { BotContext } from '../framework/context';
import type { Logger } from '../logger';

/**
 * "Join-to-create" temporary voice channels (premium). Joining a configured hub
 * spawns a channel the joiner owns; it's deleted when the last human leaves.
 *
 * The channelId -> ownerId map is per-shard in-memory state, hydrated by
 * `reconcileTempVoice` on startup and kept in sync on create/delete. The DB table
 * is the durable source of truth used to clean up orphans after a restart.
 */
const tempChannels = new Map<string, string>();

export function isTempChannel(channelId: string): boolean {
  return tempChannels.has(channelId);
}

export function ownerOfTempChannel(channelId: string): string | undefined {
  return tempChannels.get(channelId);
}

/** Voice-state entrypoint: create on hub-join, clean up on leaving an empty temp. */
export async function handleTempVoice(
  ctx: BotContext,
  oldState: VoiceState,
  newState: VoiceState,
): Promise<void> {
  const member = newState.member ?? oldState.member;
  if (!member || member.user.bot) return;
  const guildId = newState.guild.id;

  // Cleanup: left a tracked temp channel (works even if the module was disabled).
  if (oldState.channelId && oldState.channelId !== newState.channelId && oldState.channel) {
    await cleanupIfEmpty(ctx, oldState.channel).catch((err: unknown) =>
      ctx.logger.warn({ err, channelId: oldState.channelId }, 'Temp voice cleanup failed'),
    );
  }

  // Create: joined a configured hub (needs the module enabled).
  if (newState.channelId && newState.channelId !== oldState.channelId && newState.channel) {
    if (!(await ctx.config.isEnabled(guildId, 'TEMP_VOICE'))) return;
    const config = await ctx.config.getConfig(guildId, 'TEMP_VOICE');
    if (config.hubChannelIds.includes(newState.channelId)) {
      await createTempChannel(ctx, member, newState.channel, config).catch((err: unknown) =>
        ctx.logger.warn({ err, guildId }, 'Temp voice create failed'),
      );
    }
  }
}

async function createTempChannel(
  ctx: BotContext,
  member: GuildMember,
  hub: VoiceBasedChannel,
  config: TempVoiceConfig,
): Promise<void> {
  const name = config.nameTemplate.replace(/\{user\}/g, member.displayName).slice(0, 100);
  const parent = config.categoryId ?? hub.parentId ?? null;

  const channel = await hub.guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent,
    userLimit: config.defaultUserLimit,
  });

  // Move the member in. If that fails (they left instantly), bin the empty channel.
  try {
    await member.voice.setChannel(channel);
  } catch (err) {
    await channel.delete('Temp voice owner never entered').catch(() => undefined);
    throw err;
  }

  tempChannels.set(channel.id, member.id);
  await ctx.prisma.tempVoiceChannel.create({
    data: { channelId: channel.id, guildId: hub.guild.id, ownerId: member.id },
  });
}

async function cleanupIfEmpty(ctx: BotContext, channel: VoiceBasedChannel): Promise<void> {
  if (!tempChannels.has(channel.id)) return;
  if (channel.members.filter((m) => !m.user.bot).size > 0) return;

  await channel.delete('Temp voice channel empty').catch(() => undefined);
  tempChannels.delete(channel.id);
  await ctx.prisma.tempVoiceChannel
    .delete({ where: { channelId: channel.id } })
    .catch(() => undefined);
}

/**
 * On startup: drop rows whose channel is gone, delete channels that are now empty
 * (orphaned by a restart), and repopulate the in-memory owner map for the rest.
 */
export async function reconcileTempVoice(
  client: Client,
  prisma: PrismaClient,
  logger: Logger,
): Promise<void> {
  const guildIds = [...client.guilds.cache.keys()];
  if (guildIds.length === 0) return;

  const rows = await prisma.tempVoiceChannel.findMany({ where: { guildId: { in: guildIds } } });
  let cleaned = 0;
  for (const row of rows) {
    const guild = client.guilds.cache.get(row.guildId);
    const channel =
      guild?.channels.cache.get(row.channelId) ??
      (await guild?.channels.fetch(row.channelId).catch(() => null)) ??
      null;

    if (!channel || !channel.isVoiceBased()) {
      await prisma.tempVoiceChannel.delete({ where: { channelId: row.channelId } }).catch(() => undefined);
      continue;
    }
    if (channel.members.filter((m) => !m.user.bot).size === 0) {
      await channel.delete('Temp voice orphan cleanup').catch(() => undefined);
      await prisma.tempVoiceChannel.delete({ where: { channelId: row.channelId } }).catch(() => undefined);
      cleaned += 1;
    } else {
      tempChannels.set(row.channelId, row.ownerId);
    }
  }
  logger.info({ tracked: tempChannels.size, cleaned }, 'Reconciled temp voice channels');
}
