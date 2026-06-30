import { describe, expect, it } from 'vitest';
import {
  customCommandInputSchema,
  customCommandsConfigSchema,
  matchAutoResponder,
  type AutoResponder,
} from './customCommands';

const responder = (over: Partial<AutoResponder>): AutoResponder => ({
  trigger: 'hello',
  match: 'contains',
  response: 'hi',
  ignoreCase: true,
  ...over,
});

describe('matchAutoResponder', () => {
  it('matches by each strategy', () => {
    expect(
      matchAutoResponder('well hello there', [responder({ match: 'contains' })])?.response,
    ).toBe('hi');
    expect(matchAutoResponder('hello', [responder({ match: 'exact' })])).not.toBeNull();
    expect(matchAutoResponder('hello there', [responder({ match: 'exact' })])).toBeNull();
    expect(matchAutoResponder('hello there', [responder({ match: 'startswith' })])).not.toBeNull();
    expect(matchAutoResponder('say hello', [responder({ match: 'endswith' })])).not.toBeNull();
  });

  it('honors ignoreCase', () => {
    expect(matchAutoResponder('HELLO', [responder({ ignoreCase: true })])).not.toBeNull();
    expect(matchAutoResponder('HELLO', [responder({ ignoreCase: false })])).toBeNull();
  });

  it('returns the first match, or null', () => {
    expect(matchAutoResponder('nothing here', [responder({})])).toBeNull();
    const first = responder({ trigger: 'a', response: 'first' });
    const second = responder({ trigger: 'a', response: 'second' });
    expect(matchAutoResponder('a', [first, second])?.response).toBe('first');
  });
});

describe('customCommandsConfigSchema', () => {
  it('defaults prefix and empty responders', () => {
    const config = customCommandsConfigSchema.parse({});
    expect(config.prefix).toBe('!');
    expect(config.autoResponders).toEqual([]);
  });
});

describe('customCommandInputSchema', () => {
  it('accepts a text tag and an embed-only tag', () => {
    expect(customCommandInputSchema.safeParse({ name: 'rules', content: 'be nice' }).success).toBe(
      true,
    );
    expect(
      customCommandInputSchema.safeParse({ name: 'rules', embed: { description: 'be nice' } })
        .success,
    ).toBe(true);
  });

  it('rejects bad names and empty tags', () => {
    expect(customCommandInputSchema.safeParse({ name: 'No Spaces', content: 'x' }).success).toBe(
      false,
    );
    expect(customCommandInputSchema.safeParse({ name: 'UPPER', content: 'x' }).success).toBe(false);
    expect(customCommandInputSchema.safeParse({ name: 'rules' }).success).toBe(false); // no content/embed
    expect(customCommandInputSchema.safeParse({ name: 'rules', content: '   ' }).success).toBe(
      false,
    );
  });
});
