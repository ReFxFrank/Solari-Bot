import { describe, expect, it } from 'vitest';
import { embedSpecHasContent, embedSpecSchema } from './embed';

describe('embedSpecSchema', () => {
  it('accepts a valid spec and validates the color', () => {
    expect(embedSpecSchema.safeParse({ title: 'Hi', color: '#5865F2' }).success).toBe(true);
    expect(embedSpecSchema.safeParse({ title: 'Hi', color: '5865F2' }).success).toBe(true);
    expect(embedSpecSchema.safeParse({ color: 'blue' }).success).toBe(false);
    expect(embedSpecSchema.safeParse({ imageUrl: 'not a url' }).success).toBe(false);
  });
});

describe('embedSpecHasContent', () => {
  it('is true only when something renderable is present', () => {
    expect(embedSpecHasContent(null)).toBe(false);
    expect(embedSpecHasContent({})).toBe(false);
    expect(embedSpecHasContent({ color: '#fff000' })).toBe(false); // color alone doesn't render
    expect(embedSpecHasContent({ description: 'hello' })).toBe(true);
    expect(embedSpecHasContent({ imageUrl: 'https://x/y.png' })).toBe(true);
  });
});
