/**
 * Rate-limits repeated log lines. Used for connection errors (Redis) that,
 * during an outage, fire many times per second — logging each one turns a
 * single problem into thousands of lines. The first event in a window logs
 * immediately; the rest are counted and folded into the next allowed line.
 */
export class LogThrottle {
  // -Infinity so the first event is always outside the window (logs immediately).
  private lastAt = Number.NEGATIVE_INFINITY;
  private suppressed = 0;

  constructor(private readonly windowMs: number) {}

  /**
   * Record an event. Returns the count of previously-suppressed events (>= 0)
   * when the caller SHOULD log now, or `null` when this event is suppressed.
   */
  record(now: number): number | null {
    if (now - this.lastAt >= this.windowMs) {
      const suppressed = this.suppressed;
      this.lastAt = now;
      this.suppressed = 0;
      return suppressed;
    }
    this.suppressed += 1;
    return null;
  }

  /** Clear state (e.g. on recovery), returning how many were suppressed. */
  reset(): number {
    const suppressed = this.suppressed;
    this.lastAt = Number.NEGATIVE_INFINITY;
    this.suppressed = 0;
    return suppressed;
  }
}
