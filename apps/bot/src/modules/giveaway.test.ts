import { describe, expect, it } from 'vitest';
import { pickWinners } from './giveaway';

describe('pickWinners', () => {
  const entries = ['a', 'b', 'c', 'd', 'e'];

  it('returns the requested number of distinct winners from the pool', () => {
    const winners = pickWinners(entries, 3);
    expect(winners).toHaveLength(3);
    expect(new Set(winners).size).toBe(3);
    expect(winners.every((id) => entries.includes(id))).toBe(true);
  });

  it('caps at the pool size when count exceeds entries', () => {
    expect(pickWinners(['a', 'b'], 5)).toHaveLength(2);
    expect(pickWinners([], 3)).toEqual([]);
  });

  it('dedupes entries before drawing', () => {
    expect(pickWinners(['a', 'a', 'a'], 3)).toEqual(['a']);
  });
});
