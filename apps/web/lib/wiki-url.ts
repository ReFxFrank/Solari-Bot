/**
 * Public documentation URL. In production every docs link points at the wiki
 * subdomain (wiki.solari.gg) rather than the /docs path, so the wiki reads as
 * its own destination; in dev there is no wiki host, so links stay relative.
 * Client-safe (NODE_ENV is inlined at build; SOLARI_DOMAIN falls back to the
 * canonical domain) — unlike lib/wiki.ts, which imports node:fs.
 */
export function wikiUrl(path = ''): string {
  const suffix = path && !path.startsWith('/') ? `/${path}` : path;
  if (process.env.NODE_ENV !== 'production') return `/docs${suffix}`;
  const domain = process.env.SOLARI_DOMAIN ?? 'solari.gg';
  return `https://wiki.${domain}${suffix}`;
}
