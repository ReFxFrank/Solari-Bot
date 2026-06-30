import { z } from 'zod';

/**
 * Reusable embed specification (§8 Custom commands / embed builder). A bounded,
 * declarative description of a Discord embed that the dashboard builds and the
 * bot renders into an EmbedBuilder. Shared so the dashboard validates exactly
 * what the bot will accept.
 */
export const embedSpecSchema = z.object({
  title: z.string().max(256).optional(),
  description: z.string().max(4000).optional(),
  /** Hex color, with or without a leading '#'. */
  color: z
    .string()
    .regex(/^#?[0-9a-fA-F]{6}$/, 'Use a hex color like #5865F2')
    .optional(),
  url: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  footer: z.string().max(2048).optional(),
});

export type EmbedSpec = z.infer<typeof embedSpecSchema>;

/** Whether an embed spec carries any renderable content. */
export function embedSpecHasContent(spec: EmbedSpec | null | undefined): boolean {
  if (!spec) return false;
  return Boolean(
    spec.title || spec.description || spec.imageUrl || spec.thumbnailUrl || spec.footer,
  );
}
