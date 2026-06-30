import { describe, expect, it } from 'vitest';
import { formatDuration, parseDuration } from './parsing';

describe('parseDuration', () => {
  it('parses single units', () => {
    expect(parseDuration('30s')).toBe(30);
    expect(parseDuration('5m')).toBe(300);
    expect(parseDuration('2h')).toBe(7200);
    expect(parseDuration('1d')).toBe(86_400);
    expect(parseDuration('1w')).toBe(604_800);
  });

  it('sums compound durations', () => {
    expect(parseDuration('1h30m')).toBe(5400);
    expect(parseDuration('1d 12h')).toBe(86_400 + 43_200);
  });

  it('is case-insensitive and tolerant of whitespace', () => {
    expect(parseDuration('2H')).toBe(7200);
    expect(parseDuration('  10 m ')).toBe(600);
  });

  it('returns null for input with no valid tokens', () => {
    expect(parseDuration('soon')).toBeNull();
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('10x')).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats seconds into compact units', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(86_400 + 3600)).toBe('1d 1h');
  });

  it('round-trips with parseDuration', () => {
    const seconds = parseDuration('2h30m');
    expect(seconds).not.toBeNull();
    expect(formatDuration(seconds!)).toBe('2h 30m');
  });
});
