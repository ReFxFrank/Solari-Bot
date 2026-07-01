/** Brand + design tokens shared between the bot (embeds) and the dashboard. */

export const BRAND = {
  name: 'Solari',
  /** Primary accent — premium violet. */
  color: 0x8b5cf6,
  footer: 'Solari',
} as const;

/** Semantic colors as integers for discord.js embeds. */
export const COLORS = {
  brand: 0x8b5cf6,
  success: 0x10b981,
  warning: 0xf59e0b,
  danger: 0xf43f5e,
  info: 0x38bdf8,
} as const;

/** Discord platform limits worth enforcing in shared code. */
export const DISCORD_LIMITS = {
  customIdMaxLength: 100,
  embedDescriptionMaxLength: 4096,
  messageMaxLength: 2000,
  selectMenuMaxOptions: 25,
} as const;
