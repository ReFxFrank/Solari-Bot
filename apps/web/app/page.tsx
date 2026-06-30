import { BRAND } from '@helios/shared';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6">
      <div className="glass w-full rounded-2xl p-10 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-info)]">
          Phase 0 · Foundation
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">{BRAND.name}</h1>
        <p className="mx-auto mt-3 max-w-md text-pretty text-sm text-white/60">
          Self-hosted, premium-grade Discord bot &amp; dashboard. The control-panel scaffold is
          online — Discord login and live module configuration arrive in Phase 2.
        </p>
        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-[var(--color-blurple)]/40 bg-[var(--color-blurple)]/10 px-4 py-2 text-sm font-medium text-white/80">
          <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
          Scaffold online
        </div>
      </div>
    </main>
  );
}
