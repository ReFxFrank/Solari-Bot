import { describe, expect, it } from 'vitest';
import { levelFromXp, xpForLevel, xpProgress } from './leveling';

describe('xp curve', () => {
  it('xpForLevel starts at 0 and is strictly increasing', () => {
    expect(xpForLevel(0)).toBe(0);
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(2)).toBe(255);
    expect(xpForLevel(3)).toBeGreaterThan(xpForLevel(2));
  });

  it('levelFromXp inverts xpForLevel', () => {
    expect(levelFromXp(0)).toBe(0);
    expect(levelFromXp(99)).toBe(0);
    expect(levelFromXp(100)).toBe(1);
    expect(levelFromXp(254)).toBe(1);
    expect(levelFromXp(255)).toBe(2);
  });

  it('xpProgress reports progress within the level', () => {
    const progress = xpProgress(150);
    expect(progress.level).toBe(1);
    expect(progress.current).toBe(50); // 150 - xpForLevel(1)
    expect(progress.needed).toBe(155); // xpForLevel(2) - xpForLevel(1)
  });
});
