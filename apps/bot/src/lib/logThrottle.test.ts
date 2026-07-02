import { describe, expect, it } from 'vitest';
import { LogThrottle } from './logThrottle';

describe('LogThrottle', () => {
  it('logs the first event, suppresses the rest within the window', () => {
    const t = new LogThrottle(30_000);
    expect(t.record(1_000)).toBe(0); // first ever → log, nothing suppressed
    expect(t.record(1_100)).toBeNull(); // within window → suppress
    expect(t.record(5_000)).toBeNull(); // still within window → suppress
  });

  it('logs again after the window, reporting how many it suppressed', () => {
    const t = new LogThrottle(30_000);
    expect(t.record(0)).toBe(0);
    t.record(1_000);
    t.record(2_000); // 2 suppressed
    expect(t.record(31_000)).toBe(2); // window elapsed → log with the backlog
    expect(t.record(31_100)).toBeNull(); // window restarts after a logged line
  });

  it('reset returns the suppressed backlog and clears state so the next event logs', () => {
    const t = new LogThrottle(30_000);
    t.record(0);
    t.record(500);
    t.record(900); // 2 suppressed
    expect(t.reset()).toBe(2);
    expect(t.record(1_000)).toBe(0); // fresh window → logs immediately again
  });
});
