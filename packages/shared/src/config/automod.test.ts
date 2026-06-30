import { describe, expect, it } from 'vitest';
import {
  automodConfigSchema,
  containsDisallowedLink,
  containsInvite,
  exceedsCaps,
  matchBlockedWord,
} from './automod';

describe('automodConfigSchema', () => {
  it('fills nested rule defaults from an empty object', () => {
    const config = automodConfigSchema.parse({});
    expect(config.invites.enabled).toBe(false);
    expect(config.invites.action).toBe('delete');
    expect(config.mentions.maxMentions).toBe(5);
    expect(config.spam.maxMessages).toBe(5);
    expect(config.words.list).toEqual([]);
  });
});

describe('containsInvite', () => {
  it('detects discord invite forms', () => {
    expect(containsInvite('join discord.gg/abc123')).toBe(true);
    expect(containsInvite('https://discord.com/invite/xYz')).toBe(true);
    expect(containsInvite('https://discordapp.com/invite/xYz')).toBe(true);
    expect(containsInvite('just a normal message')).toBe(false);
  });

  it('does not flag non-discord .gg domains', () => {
    expect(containsInvite('https://op.gg/summoner/foo')).toBe(false);
    expect(containsInvite('check start.gg/tournament/x')).toBe(false);
    expect(containsInvite('a tenor.gg/view/x gif')).toBe(false);
  });
});

describe('containsDisallowedLink', () => {
  it('blocks links outside the allowlist (subdomains included)', () => {
    expect(containsDisallowedLink('see https://evil.com/x', ['github.com'])).toBe(true);
    expect(containsDisallowedLink('see https://github.com/a', ['github.com'])).toBe(false);
    expect(containsDisallowedLink('see https://gist.github.com/a', ['github.com'])).toBe(false);
    expect(containsDisallowedLink('no links here', ['github.com'])).toBe(false);
  });

  it('catches scheme-less links that Discord auto-linkifies', () => {
    expect(containsDisallowedLink('visit www.evil.com now', ['mysite.com'])).toBe(true);
    expect(containsDisallowedLink('go to evil.com/promo', ['mysite.com'])).toBe(true);
    // bare dotted prose with no scheme/www/path is left alone
    expect(containsDisallowedLink('I use node.js daily', ['mysite.com'])).toBe(false);
  });

  it('normalizes port and userinfo before the allowlist check', () => {
    expect(containsDisallowedLink('https://good.com:8080/x', ['good.com'])).toBe(false);
    expect(containsDisallowedLink('https://good.com:443/x', ['good.com'])).toBe(false);
    expect(containsDisallowedLink('https://user@good.com/x', ['good.com'])).toBe(false);
    expect(containsDisallowedLink('https://www.good.com/x', ['good.com'])).toBe(false);
  });
});

describe('exceedsCaps', () => {
  it('flags shouty messages over the threshold and length floor', () => {
    expect(exceedsCaps('STOP YELLING RIGHT NOW', 70, 10)).toBe(true);
    expect(exceedsCaps('Hello there friend', 70, 10)).toBe(false);
    expect(exceedsCaps('OK', 70, 10)).toBe(false); // below min length
  });
});

describe('matchBlockedWord', () => {
  it('matches whole words case-insensitively and is escape-safe', () => {
    expect(matchBlockedWord('this is Badword here', ['badword'])).toBe('Badword');
    expect(matchBlockedWord('assassin is fine', ['ass'])).toBeNull(); // whole-word only
    // regex metachars are escaped (treated literally, not as a pattern)
    expect(matchBlockedWord('build v1.0 now', ['v1.0'])).toBe('v1.0');
    expect(matchBlockedWord('build v1x0 now', ['v1.0'])).toBeNull();
    expect(matchBlockedWord('clean text', ['nope'])).toBeNull();
    expect(matchBlockedWord('anything', [])).toBeNull();
  });
});
