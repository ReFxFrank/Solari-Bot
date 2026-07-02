import { ChannelType, GatewayOpcodes, PermissionFlagsBits, type Client, type Guild } from 'discord.js';
import { prisma } from '@solari/database';
import type { Logger } from '../logger';

/**
 * "Stay in voice": park the bot in a configured voice channel 24/7 (like lofi/
 * counter bots). We only need presence — no audio — so a raw gateway voice-state
 * update is enough; the whole voice/UDP stack stays out of the build. The bot
 * joins self-deafened and self-muted.
 */

/** Send the gateway op that moves this bot into (or out of) a voice channel. */
function sendVoiceState(guild: Guild, channelId: string | null): void {
  guild.shard.send({
    op: GatewayOpcodes.VoiceStateUpdate,
    d: {
      guild_id: guild.id,
      channel_id: channelId,
      self_mute: true,
      self_deaf: true,
    },
  });
}

/**
 * Reconcile the bot's voice presence in one guild with its configured channel:
 * join it, move to it, or disconnect when unset/invalid. Safe to call
 * repeatedly — a no-op when already in the right place.
 */
export async function syncStayVoice(guild: Guild, logger: Logger): Promise<void> {
  const row = await prisma.guild.findUnique({
    where: { id: guild.id },
    select: { stayVoiceChannelId: true },
  });
  const targetId = row?.stayVoiceChannelId ?? null;
  const currentId = guild.members.me?.voice.channelId ?? null;

  if (!targetId) {
    if (currentId) sendVoiceState(guild, null);
    return;
  }
  if (currentId === targetId) return;

  const channel =
    guild.channels.cache.get(targetId) ??
    (await guild.channels.fetch(targetId).catch(() => null));
  const joinable =
    channel &&
    (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) &&
    guild.members.me
      ?.permissionsIn(channel)
      .has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]);
  if (!joinable) {
    logger.warn(
      { guildId: guild.id, channelId: targetId },
      'Stay-voice channel missing or not joinable (need View Channel + Connect)',
    );
    return;
  }
  sendVoiceState(guild, targetId);
}

/** On startup: rejoin the configured channel in every guild that set one. */
export async function syncAllStayVoice(client: Client<true>, logger: Logger): Promise<void> {
  const rows = await prisma.guild.findMany({
    where: { stayVoiceChannelId: { not: null }, id: { in: [...client.guilds.cache.keys()] } },
    select: { id: true },
  });
  for (const row of rows) {
    const guild = client.guilds.cache.get(row.id);
    if (guild) await syncStayVoice(guild, logger).catch(() => undefined);
  }
}

/** Debounced per-guild rejoin, used when the bot gets disconnected/moved. */
const pendingRejoins = new Map<string, NodeJS.Timeout>();

export function scheduleStayVoiceRejoin(guild: Guild, logger: Logger, delayMs = 3000): void {
  const existing = pendingRejoins.get(guild.id);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    pendingRejoins.delete(guild.id);
    void syncStayVoice(guild, logger).catch(() => undefined);
  }, delayMs);
  timer.unref();
  pendingRejoins.set(guild.id, timer);
}
