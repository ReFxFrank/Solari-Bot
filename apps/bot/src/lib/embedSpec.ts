import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import { embedSpecHasContent, type EmbedSpec } from '@helios/shared';

/**
 * Render an EmbedSpec into a discord.js EmbedBuilder, optionally running each
 * text field through `transform` (placeholder substitution). Returns null when
 * the spec has no renderable content so callers can omit the embed entirely.
 */
export function buildEmbedFromSpec(
  spec: EmbedSpec,
  transform: (value: string) => string = (value) => value,
): EmbedBuilder | null {
  if (!embedSpecHasContent(spec)) return null;
  const embed = new EmbedBuilder();
  if (spec.title) embed.setTitle(transform(spec.title).slice(0, 256));
  if (spec.description) embed.setDescription(transform(spec.description).slice(0, 4096));
  if (spec.url && spec.title) embed.setURL(spec.url);
  if (spec.color) {
    embed.setColor(Number.parseInt(spec.color.replace('#', ''), 16) as ColorResolvable);
  }
  if (spec.imageUrl) embed.setImage(spec.imageUrl);
  if (spec.thumbnailUrl) embed.setThumbnail(spec.thumbnailUrl);
  if (spec.footer) embed.setFooter({ text: transform(spec.footer).slice(0, 2048) });
  return embed;
}
