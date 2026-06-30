import type { ScheduledMessageJob } from '@helios/jobs';
import { fireScheduledMessage } from '../../modules/scheduledMessages';
import type { JobContext } from '../../services/jobs';

export async function handleScheduledMessage(
  data: ScheduledMessageJob,
  ctx: JobContext,
): Promise<void> {
  await fireScheduledMessage(data.scheduledMessageId, {
    client: ctx.client,
    logger: ctx.logger,
    jobs: ctx.jobs,
  });
}
