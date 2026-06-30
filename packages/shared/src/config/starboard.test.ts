import { describe, expect, it } from 'vitest';
import { starboardAction } from './starboard';

describe('starboardAction', () => {
  it('creates on reaching the threshold without an existing entry', () => {
    expect(starboardAction(3, 3, false)).toBe('create');
  });
  it('updates at/above the threshold with an existing entry', () => {
    expect(starboardAction(5, 3, true)).toBe('update');
  });
  it('removes when dropping below the threshold with an existing entry', () => {
    expect(starboardAction(2, 3, true)).toBe('remove');
  });
  it('does nothing below the threshold without an entry', () => {
    expect(starboardAction(1, 3, false)).toBe('none');
  });
});
