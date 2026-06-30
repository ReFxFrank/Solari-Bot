/** Parsing helpers shared across commands. */

const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86_400,
  w: 604_800,
};

/**
 * Parse a human duration like "30m", "1h30m", "2d", "1w" into seconds.
 * Returns null if the string contains no valid duration tokens.
 */
export function parseDuration(input: string): number | null {
  const matches = input.toLowerCase().matchAll(/(\d+)\s*(w|d|h|m|s)/g);
  let total = 0;
  let found = false;
  for (const match of matches) {
    const amount = Number(match[1]);
    const unit = match[2];
    if (!Number.isFinite(amount) || unit === undefined) continue;
    total += amount * (UNIT_SECONDS[unit] ?? 0);
    found = true;
  }
  return found ? total : null;
}

/** Format a number of seconds as a compact human string ("1d 2h 3m"). */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0s';
  const parts: string[] = [];
  let remaining = Math.floor(seconds);
  for (const [unit, size] of [
    ['w', 604_800],
    ['d', 86_400],
    ['h', 3600],
    ['m', 60],
    ['s', 1],
  ] as const) {
    const count = Math.floor(remaining / size);
    if (count > 0) {
      parts.push(`${count}${unit}`);
      remaining -= count * size;
    }
  }
  return parts.join(' ');
}
