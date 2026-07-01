import { describe, expect, it } from 'vitest';
import { embedSpecHasContent, embedSpecSchema } from './embed';

describe('embedSpecSchema', () => {
  it('accepts a valid spec and validates the color', () => {
    expect(embedSpecSchema.safeParse({ title: 'Hi', color: '#5865F2' }).success).toBe(true);
    expect(embedSpecSchema.safeParse({ title: 'Hi', color: '5865F2' }).success).toBe(true);
    expect(embedSpecSchema.safeParse({ color: 'blue' }).success).toBe(false);
    expect(embedSpecSchema.safeParse({ imageUrl: 'not a url' }).success).toBe(false);
  });

  it('still parses the legacy shape (no author/fields/timestamp)', () => {
    const legacy = { title: 'T', description: 'D', color: '#000000', footer: 'F' };
    expect(embedSpecSchema.safeParse(legacy).success).toBe(true);
  });

  it('validates author, fields, footer icon, and timestamp', () => {
    const parsed = embedSpecSchema.safeParse({
      author: { name: 'Solari', iconUrl: 'https://x/y.png', url: 'https://x' },
      fields: [{ name: 'A', value: 'B', inline: true }],
      footer: 'hello',
      footerIconUrl: 'https://x/z.png',
      timestamp: true,
    });
    expect(parsed.success).toBe(true);
    expect(embedSpecSchema.safeParse({ author: { name: '' } }).success).toBe(false);
    expect(embedSpecSchema.safeParse({ author: { name: 'x', iconUrl: 'nope' } }).success).toBe(false);
    // A field needs both name and value.
    expect(embedSpecSchema.safeParse({ fields: [{ name: 'A', value: '' }] }).success).toBe(false);
    // Max 25 fields.
    const many = Array.from({ length: 26 }, (_, i) => ({ name: `n${i}`, value: 'v' }));
    expect(embedSpecSchema.safeParse({ fields: many }).success).toBe(false);
  });
});

describe('embedSpecHasContent', () => {
  it('is true only when something renderable is present', () => {
    expect(embedSpecHasContent(null)).toBe(false);
    expect(embedSpecHasContent({})).toBe(false);
    expect(embedSpecHasContent({ color: '#fff000' })).toBe(false); // color alone doesn't render
    expect(embedSpecHasContent({ description: 'hello' })).toBe(true);
    expect(embedSpecHasContent({ imageUrl: 'https://x/y.png' })).toBe(true);
    expect(embedSpecHasContent({ author: { name: 'Solari' } })).toBe(true);
    expect(embedSpecHasContent({ fields: [{ name: 'A', value: 'B', inline: false }] })).toBe(true);
    expect(embedSpecHasContent({ fields: [] })).toBe(false);
  });
});
