/**
 * Shared XP curve so the bot and dashboard agree on levels. MEE6-style
 * cumulative curve: the XP needed to go from level `l` to `l+1` is
 * `5*l^2 + 50*l + 100`.
 */

/** Total cumulative XP required to reach a given level (level 0 == 0 XP). */
export function xpForLevel(level: number): number {
  let total = 0;
  for (let l = 0; l < level; l++) {
    total += 5 * l * l + 50 * l + 100;
  }
  return total;
}

/** The level a given total XP corresponds to. */
export function levelFromXp(xp: number): number {
  let level = 0;
  while (xp >= xpForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

/** Progress within the current level: `current`/`needed` XP toward the next. */
export function xpProgress(xp: number): { level: number; current: number; needed: number } {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, current: xp - base, needed: next - base };
}
