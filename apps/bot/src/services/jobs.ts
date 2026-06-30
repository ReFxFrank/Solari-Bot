import { Queue, Worker } from 'bullmq';
import { QUEUE_NAMES, QUEUE_PREFIX, type TempActionExpireJob } from '@helios/jobs';
import type { Client } from 'discord.js';
import { prisma, type PrismaClient } from '@helios/database';
import type { Logger } from '../logger';
import { bullConnection } from './redis';
import { handleTempActionExpire } from '../jobs/handlers/tempActionExpire';

/** Dependencies handed to job handlers. */
export interface JobContext {
  client: Client;
  prisma: PrismaClient;
  logger: Logger;
}

/**
 * Durable job service (§5.4). Owns the BullMQ Queues (for enqueuing) and
 * Workers (for processing) that run inside the bot process. Because jobs live
 * in Redis, every scheduled effect survives a restart — verify by restarting
 * mid-timer.
 */
export class JobService {
  private readonly queues = new Map<string, Queue>();
  private readonly workers: Worker[] = [];
  private readonly ctx: JobContext;

  constructor(client: Client, logger: Logger) {
    this.ctx = { client, prisma, logger };
  }

  private queue(name: string): Queue {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, { connection: bullConnection, prefix: QUEUE_PREFIX });
      this.queues.set(name, queue);
    }
    return queue;
  }

  /**
   * Schedule a temporary-action reversal after `delayMs`. `jobId` makes this
   * idempotent — re-scheduling with the same id is a no-op while the job is
   * pending.
   */
  async scheduleTempAction(
    data: TempActionExpireJob,
    delayMs: number,
    jobId: string,
  ): Promise<void> {
    await this.queue(QUEUE_NAMES.tempActionExpire).add('tempActionExpire', data, {
      delay: Math.max(0, delayMs),
      jobId,
      removeOnComplete: true,
      removeOnFail: 100,
    });
  }

  /** Cancel a scheduled temp-action (e.g. a manual unban before expiry). */
  async cancelTempAction(jobId: string): Promise<void> {
    const job = await this.queue(QUEUE_NAMES.tempActionExpire).getJob(jobId);
    await job?.remove();
  }

  /** Start the workers. Call after login — handlers use the authed REST client. */
  startWorkers(): void {
    const tempActions = new Worker<TempActionExpireJob>(
      QUEUE_NAMES.tempActionExpire,
      (job) => handleTempActionExpire(job.data, this.ctx),
      { connection: bullConnection, prefix: QUEUE_PREFIX },
    );
    tempActions.on('failed', (job, err) =>
      this.ctx.logger.error({ err, jobId: job?.id }, 'tempActionExpire job failed'),
    );
    this.workers.push(tempActions);
    this.ctx.logger.info('Job workers started');
  }

  async close(): Promise<void> {
    await Promise.allSettled([
      ...this.workers.map((worker) => worker.close()),
      ...[...this.queues.values()].map((queue) => queue.close()),
    ]);
  }
}

/** Stable job id for a guild member's temp-ban expiry (no `:` — BullMQ keys). */
export function tempBanJobId(guildId: string, userId: string): string {
  return `tempban-${guildId}-${userId}`;
}
