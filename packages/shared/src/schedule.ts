import { z } from 'zod';

/**
 * Scheduled-message contracts (§8). Shared so the dashboard form, the server
 * action, and the bot's job handler all agree on the repeat cadence and the
 * "when does it fire next" maths.
 */

/** Mirrors the `ScheduleRepeat` enum in the Prisma schema — keep in sync. */
export const SCHEDULE_REPEATS = ['NONE', 'HOURLY', 'DAILY', 'WEEKLY'] as const;
export type ScheduleRepeat = (typeof SCHEDULE_REPEATS)[number];

export const REPEAT_INTERVAL_MS = {
  HOURLY: 3_600_000,
  DAILY: 86_400_000,
  WEEKLY: 604_800_000,
} as const satisfies Record<Exclude<ScheduleRepeat, 'NONE'>, number>;

export const REPEAT_LABELS: Record<ScheduleRepeat, string> = {
  NONE: 'Once',
  HOURLY: 'Hourly',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
};

/**
 * Next fire time for a recurring schedule, always strictly after `now`.
 * Returns null for a one-off (`NONE`). When the base time is in the past it
 * jumps forward by whole intervals in one step, so a long outage replays at
 * most one occurrence instead of every missed one (no catch-up storm).
 */
export function computeNextRun(base: Date, repeat: ScheduleRepeat, now: Date): Date | null {
  if (repeat === 'NONE') return null;
  const interval = REPEAT_INTERVAL_MS[repeat];
  let next = base.getTime();
  if (next <= now.getTime()) {
    const missed = Math.floor((now.getTime() - next) / interval) + 1;
    next += missed * interval;
  }
  return new Date(next);
}

/** Input accepted by the dashboard when creating a scheduled message. */
export const scheduledMessageInputSchema = z.object({
  channelId: z.string().regex(/^\d{17,20}$/, 'Enter a valid channel ID.'),
  name: z.string().max(100).optional(),
  content: z.string().min(1, 'Message cannot be empty.').max(2000),
  repeat: z.enum(SCHEDULE_REPEATS).default('NONE'),
  /** ISO-8601 instant of the first (or next) run. */
  firstRunAt: z.string().datetime(),
});
export type ScheduledMessageInput = z.infer<typeof scheduledMessageInputSchema>;
