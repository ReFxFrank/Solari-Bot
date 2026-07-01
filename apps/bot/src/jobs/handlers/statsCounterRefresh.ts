import type { StatsCounterRefreshJob } from '@solari/jobs';
import { refreshStatsCounters } from '../../modules/statsCounters';
import type { JobContext } from '../../services/jobs';

export async function handleStatsCounterRefresh(
  data: StatsCounterRefreshJob,
  ctx: JobContext,
): Promise<void> {
  await refreshStatsCounters(data.guildId, {
    client: ctx.client,
    logger: ctx.logger,
    jobs: ctx.jobs,
  });
}
