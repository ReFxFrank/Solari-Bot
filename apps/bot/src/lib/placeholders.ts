/**
 * Placeholder substitution for welcome/leave/level messages (§8C). Accepts a
 * structural member shape so it works with full and partial members and is
 * trivially testable.
 */
export interface PlaceholderMember {
  user: { id: string; tag: string; username: string; createdTimestamp: number };
  guild: { name: string; memberCount: number };
}

export function applyPlaceholders(template: string, member: PlaceholderMember): string {
  const { user, guild } = member;
  const accountAgeDays = Math.max(0, Math.floor((Date.now() - user.createdTimestamp) / 86_400_000));

  const replacements: Record<string, string> = {
    '{user}': `<@${user.id}>`,
    '{user.mention}': `<@${user.id}>`,
    '{user.tag}': user.tag,
    '{user.name}': user.username,
    '{user.id}': user.id,
    '{server}': guild.name,
    '{server.name}': guild.name,
    '{memberCount}': String(guild.memberCount),
    '{accountAge}': `${accountAgeDays} day${accountAgeDays === 1 ? '' : 's'}`,
  };

  return template.replace(/\{[a-zA-Z.]+\}/g, (token) => replacements[token] ?? token);
}
