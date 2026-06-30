import { describe, expect, it } from 'vitest';
import type { ChatInputCommandInteraction } from 'discord.js';
import { atLeast, Cooldown, isBotOwner, RequireGuild } from './permissions';

describe('atLeast', () => {
  it('ranks levels correctly', () => {
    expect(atLeast('owner', 'mod')).toBe(true);
    expect(atLeast('admin', 'mod')).toBe(true);
    expect(atLeast('mod', 'mod')).toBe(true);
    expect(atLeast('member', 'mod')).toBe(false);
    expect(atLeast('mod', 'admin')).toBe(false);
  });
});

describe('isBotOwner', () => {
  it('matches the OWNER_IDS from the test env', () => {
    expect(isBotOwner('111111111111111111')).toBe(true);
    expect(isBotOwner('999999999999999999')).toBe(false);
  });
});

describe('RequireGuild', () => {
  it('denies outside a guild and allows inside', async () => {
    const outside = { inGuild: () => false } as unknown as ChatInputCommandInteraction;
    const inside = { inGuild: () => true } as unknown as ChatInputCommandInteraction;
    // ctx is unused by RequireGuild.
    const ctx = {} as never;
    expect((await RequireGuild(outside, ctx)).ok).toBe(false);
    expect((await RequireGuild(inside, ctx)).ok).toBe(true);
  });
});

describe('Cooldown', () => {
  it('blocks a second invocation within the window', async () => {
    const cooldown = Cooldown(60);
    const interaction = {
      commandName: 'ping',
      user: { id: 'user-1' },
    } as unknown as ChatInputCommandInteraction;
    const ctx = {} as never;

    expect((await cooldown(interaction, ctx)).ok).toBe(true);
    const second = await cooldown(interaction, ctx);
    expect(second.ok).toBe(false);
    expect(second.message).toMatch(/try again/i);
  });

  it('tracks cooldowns per user', async () => {
    const cooldown = Cooldown(60);
    const a = { commandName: 'ping', user: { id: 'a' } } as unknown as ChatInputCommandInteraction;
    const b = { commandName: 'ping', user: { id: 'b' } } as unknown as ChatInputCommandInteraction;
    const ctx = {} as never;

    expect((await cooldown(a, ctx)).ok).toBe(true);
    expect((await cooldown(b, ctx)).ok).toBe(true); // different user, not blocked
  });
});
