import { describe, expect, it } from 'vitest';
import { buttonRoleChange, selectRoleChange } from './roles';

const panel = ['a', 'b', 'c'];

describe('buttonRoleChange', () => {
  it('NORMAL toggles the clicked role', () => {
    expect(buttonRoleChange('NORMAL', panel, new Set(), 'a')).toEqual({ add: ['a'], remove: [] });
    expect(buttonRoleChange('NORMAL', panel, new Set(['a']), 'a')).toEqual({
      add: [],
      remove: ['a'],
    });
  });

  it('UNIQUE adds the clicked role and removes other panel roles', () => {
    expect(buttonRoleChange('UNIQUE', panel, new Set(['b']), 'a')).toEqual({
      add: ['a'],
      remove: ['b'],
    });
    // clicking a held unique role removes it
    expect(buttonRoleChange('UNIQUE', panel, new Set(['a']), 'a')).toEqual({
      add: [],
      remove: ['a'],
    });
  });

  it('VERIFY only ever grants', () => {
    expect(buttonRoleChange('VERIFY', panel, new Set(), 'a')).toEqual({ add: ['a'], remove: [] });
    expect(buttonRoleChange('VERIFY', panel, new Set(['a']), 'a')).toEqual({ add: [], remove: [] });
  });

  it('ignores roles not on the panel', () => {
    expect(buttonRoleChange('NORMAL', panel, new Set(), 'z')).toEqual({ add: [], remove: [] });
  });
});

describe('selectRoleChange', () => {
  it('NORMAL sets panel roles to exactly the selection', () => {
    expect(selectRoleChange('NORMAL', panel, new Set(['b']), ['a', 'c'])).toEqual({
      add: ['a', 'c'],
      remove: ['b'],
    });
  });

  it('UNIQUE keeps only the first selected', () => {
    expect(selectRoleChange('UNIQUE', panel, new Set(['c']), ['a', 'b'])).toEqual({
      add: ['a'],
      remove: ['c'],
    });
  });

  it('VERIFY adds selected, never removes', () => {
    expect(selectRoleChange('VERIFY', panel, new Set(['b']), ['a'])).toEqual({
      add: ['a'],
      remove: [],
    });
  });

  it('ignores selections not on the panel', () => {
    expect(selectRoleChange('NORMAL', panel, new Set(), ['a', 'z'])).toEqual({
      add: ['a'],
      remove: [],
    });
  });
});
