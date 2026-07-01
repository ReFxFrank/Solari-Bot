import { BRAND } from '@solari/shared';

/**
 * Solari brand mark. Renders `/solari-logo.png` (drop the galaxy logo into
 * apps/web/public/) layered over a violet letter-tile fallback — so before the
 * image is added (or if it ever fails to load) the "S" tile shows through
 * instead of a broken-image icon. Once the PNG lands it covers the tile.
 *
 * Server-component friendly (plain <img>, no client JS). Size in px.
 */
export function BrandMark({
  size = 28,
  rounded = 'rounded-lg',
  className = '',
}: {
  size?: number;
  rounded?: string;
  className?: string;
}) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden ${rounded} bg-[var(--color-brand-strong)] font-semibold text-white ${className}`}
      style={{ height: size, width: size, fontSize: Math.round(size * 0.46) }}
    >
      {BRAND.name.slice(0, 1)}
      <img
        src="/solari-logo.png"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
    </span>
  );
}
