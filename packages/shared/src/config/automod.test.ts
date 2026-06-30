import { describe, expect, it } from 'vitest';
import {
  automodConfigSchema,
  containsDisallowedLink,
  containsInvite,
  evaluateJoinRate,
  exceedsCaps,
  isAccountTooNew,
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

  it('fills raid and verification defaults', () => {
    const config = automodConfigSchema.parse({});
    expect(config.raid.enabled).toBe(false);
    expect(config.raid.minAccountAgeHours).toBe(0);
    expect(config.raid.joinThreshold).toBe(10);
    expect(config.raid.raidAction).toBe('kick');
    expect(config.verification.enabled).toBe(false);
    expect(config.verification.buttonLabel).toBe('Verify');
    expect(config.verification.verifiedRoleId).toBe('');
  });
});

describe('isAccountTooNew', () => {
  const now = 1_000 * 3_600_000; // arbitrary "now" in ms

  it('is disabled when the floor is 0', () => {
    expect(isAccountTooNew(0, 0, now)).toBe(false);
  });

  it('flags accounts younger than the floor', () => {
    const oneHourOld = now - 1 * 3_600_000;
    expect(isAccountTooNew(oneHourOld, 24, now)).toBe(true);
  });

  it('allows accounts at or above the floor', () => {
    const exactlyADayOld = now - 24 * 3_600_000;
    expect(isAccountTooNew(exactlyADayOld, 24, now)).toBe(false);
    const olderStill = now - 48 * 3_600_000;
    expect(isAccountTooNew(olderStill, 24, now)).toBe(false);
  });
});

describe('evaluateJoinRate', () => {
  it('prunes timestamps outside the window', () => {
    const now = 100_000;
    const stamps = [now - 20_000, now - 5_000, now - 1_000, now];
    const { recent } = evaluateJoinRate(stamps, 10, 50, now);
    expect(recent).toEqual([now - 5_000, now - 1_000, now]); // 20s-old dropped
  });

  it('trips when the in-window count reaches the threshold', () => {
    const now = 100_000;
    const stamps = [now - 4_000, now - 3_000, now - 2_000, now - 1_000, now];
    expect(evaluateJoinRate(stamps, 10, 5, now).raid).toBe(true);
    expect(evaluateJoinRate(stamps, 10, 6, now).raid).toBe(false);
  });

  it('does not count expired joins toward the threshold', () => {
    const now = 100_000;
    const stamps = [now - 30_000, now - 25_000, now - 20_000, now]; // only 1 in a 10s window
    expect(evaluateJoinRate(stamps, 10, 3, now).raid).toBe(false);
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
