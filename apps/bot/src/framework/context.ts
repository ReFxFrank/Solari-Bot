import type { Client } from 'discord.js';
import type { PrismaClient } from '@helios/database';
import type { Redis } from 'ioredis';
import type { Logger } from '../logger';
import type { ConfigCache } from '../services/configCache';
import type { JobService } from '../services/jobs';

/**
 * Per-shard singletons handed to every command, event, and precondition. Built
 * once in `client.ts` and threaded through so nothing reaches for module-level
 * globals.
 */
export interface BotContext {
  client: Client;
  logger: Logger;
  prisma: PrismaClient;
  config: ConfigCache;
  jobs: JobService;
  redis: Redis;
}
