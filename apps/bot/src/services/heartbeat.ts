import type { Client } from 'discord.js';
import { shardStatusKey, type ShardStatus } from '@solari/shared';
import { redis } from './redis';

const INTERVAL_MS = 30_000;
/** 3 missed beats before the shard reads as down on /status. */
const TTL_SECONDS = 90;

/**
 * Publish this shard's health to Redis on a short TTL so the public /status
 * page can show live bot state without touching the Discord API. Returns a
 * stop function for shutdown.
 */
export function startHeartbeat(client: Client<true>, shardId: number): () => void {
  const beat = async (): Promise<void> => {
    const status: ShardStatus = {
      shardId,
      ping: Math.round(client.ws.ping),
      guilds: client.guilds.cache.size,
      uptimeMs: client.uptime ?? 0,
      updatedAt: new Date().toISOString(),
    };
    await redis.set(shardStatusKey(shardId), JSON.stringify(status), 'EX', TTL_SECONDS);
  };
  // Swallow Redis hiccups — the TTL turning the key stale IS the failure signal.
  const safeBeat = (): void => void beat().catch(() => undefined);
  safeBeat();
  const timer = setInterval(safeBeat, INTERVAL_MS);
  return () => clearInterval(timer);
}
