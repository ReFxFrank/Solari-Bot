import { describe, expect, it } from 'vitest';
import { applyPlaceholders, type PlaceholderMember } from './placeholders';

const member: PlaceholderMember = {
  user: {
    id: '42',
    tag: 'cool#0001',
    username: 'cool',
    createdTimestamp: Date.now() - 5 * 86_400_000,
  },
  guild: { name: 'My Server', memberCount: 100 },
};

describe('applyPlaceholders', () => {
  it('substitutes known tokens', () => {
    expect(applyPlaceholders('Welcome {user} to {server}!', member)).toBe(
      'Welcome <@42> to My Server!',
    );
    expect(applyPlaceholders('You are member #{memberCount}', member)).toBe('You are member #100');
    expect(applyPlaceholders('{user.tag} / {user.name} / {user.id}', member)).toBe(
      'cool#0001 / cool / 42',
    );
    expect(applyPlaceholders('{user.mention}', member)).toBe('<@42>');
  });

  it('leaves unknown tokens untouched', () => {
    expect(applyPlaceholders('{unknown} {user}', member)).toBe('{unknown} <@42>');
  });

  it('renders account age in days', () => {
    expect(applyPlaceholders('{accountAge}', member)).toBe('5 days');
  });
});
