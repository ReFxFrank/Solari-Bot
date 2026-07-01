# Static assets (`apps/web/public`)

Files here are served from the web root, e.g. `public/solari-logo.png` → `/solari-logo.png`.

## Brand logo — `solari-logo.png`

Drop the Solari galaxy logo here as **`solari-logo.png`** (exact filename, lowercase).

A single file powers everything:

- The favicon / browser tab icon, Apple touch icon, and shortcut icon
  (wired in `app/layout.tsx` → `metadata.icons`).
- Open Graph / Twitter link-preview image (`metadata.openGraph`, `metadata.twitter`).
- The header + footer brand mark (`components/marketing/brand-mark.tsx`,
  rendered via the `<BrandMark />` component).

**Recommended:** a square PNG, **512×512** (or larger), transparent or violet
background. The `<BrandMark />` uses `object-cover` inside a rounded tile, so a
square source crops cleanly.

Until the file exists, the brand mark falls back to the violet "S" tile and the
favicon slot 404s — both harmless. The moment `solari-logo.png` lands, every
slot picks it up automatically (no code change needed).

### Optional extras (auto-detected by Next.js if added to `app/`)

- `app/icon.png` — overrides the favicon with a dedicated icon file.
- `app/apple-icon.png` — dedicated Apple touch icon.
- `app/opengraph-image.png` — dedicated 1200×630 social share image.
