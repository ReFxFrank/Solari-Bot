import { prisma } from '@solari/database';
import {
  REDIS_CHANNELS,
  configCacheKey,
  hasConfigSchema,
  parseModuleConfig,
  type ConfigUpdateMessage,
  type Module,
  type ModuleConfig,
  type ModuleWithSchema,
} from '@solari/shared';
import { logger } from '../logger';
import { subscriber } from './redis';

interface CacheEntry {
  /** Parsed config (with defaults filled). */
  value: unknown;
  /** Whether the module row exists and is enabled. */
  enabled: boolean;
  /** Epoch ms when this entry was loaded. */
  loadedAt: number;
}

/**
 * Per-guild, per-module config cache (§4.2).
 *
 * Reads are served from an in-memory Map. The dashboard publishes
 * `helios:config:update` after a write; the subscriber here evicts the matching
 * entry so the next read lazily reloads from Postgres — config changes go live
 * in <1s without a restart.
 *
 * A short TTL is layered on top as a safety net (flag): Redis pub/sub has no
 * delivery guarantee, so if an invalidation is missed (e.g. a brief subscriber
 * disconnect) a stale entry still self-heals within `ttlMs`.
 */
export class ConfigCache {
  private readonly store = new Map<string, CacheEntry>();

  constructor(private readonly ttlMs = 5 * 60 * 1000) {}

  /** Begin listening for invalidation messages. Call once at startup. */
  async start(): Promise<void> {
    await subscriber.subscribe(REDIS_CHANNELS.configUpdate);
    subscriber.on('message', (channel, raw) => {
      if (channel !== REDIS_CHANNELS.configUpdate) return;
      try {
        const msg = JSON.parse(raw) as ConfigUpdateMessage;
        this.invalidate(msg.guildId, msg.module);
        logger.debug({ guildId: msg.guildId, module: msg.module }, 'Config cache invalidated');
      } catch (err) {
        logger.warn({ err, raw }, 'Ignoring malformed config:update message');
      }
    });
    logger.info('Config cache subscribed to invalidation channel');
  }

  invalidate(guildId: string, module: Module): void {
    this.store.delete(configCacheKey(guildId, module));
  }

  private fresh(entry: CacheEntry | undefined): entry is CacheEntry {
    return entry !== undefined && Date.now() - entry.loadedAt < this.ttlMs;
  }

  private async load(guildId: string, module: Module): Promise<CacheEntry> {
    const row = await prisma.guildModuleConfig.findUnique({
      where: { guildId_module: { guildId, module } },
    });
    const value = hasConfigSchema(module)
      ? parseModuleConfig(module, row?.config ?? {})
      : (row?.config ?? {});
    const entry: CacheEntry = { value, enabled: row?.enabled ?? false, loadedAt: Date.now() };
    this.store.set(configCacheKey(guildId, module), entry);
    return entry;
  }

  private async resolve(guildId: string, module: Module): Promise<CacheEntry> {
    const cached = this.store.get(configCacheKey(guildId, module));
    if (this.fresh(cached)) return cached;
    return this.load(guildId, module);
  }

  /** Typed config getter for modules with a registered zod schema. */
  async getConfig<M extends ModuleWithSchema>(
    guildId: string,
    module: M,
  ): Promise<ModuleConfig<M>> {
    const entry = await this.resolve(guildId, module);
    return entry.value as ModuleConfig<M>;
  }

  /** Whether a module is enabled for a guild. */
  async isEnabled(guildId: string, module: Module): Promise<boolean> {
    const entry = await this.resolve(guildId, module);
    return entry.enabled;
  }

  /** Test/diagnostic helper. */
  clear(): void {
    this.store.clear();
  }
}
