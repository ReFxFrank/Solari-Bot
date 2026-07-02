/**
 * Decorative, CSS-only mock of the dashboard for the landing hero — abstract
 * bars and toggles instead of a screenshot, so it never goes stale and ships
 * no image weight. Purely presentational.
 */
export function DashboardPreview() {
  return (
    <div
      aria-hidden
      className="glass mx-auto max-w-2xl rounded-2xl p-2 shadow-2xl shadow-[var(--color-brand)]/10 sm:p-3"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-3 hidden flex-1 items-center rounded-md bg-white/[0.04] px-3 py-1 text-[10px] tracking-wide text-white/35 sm:flex">
          solari.gg/servers
        </span>
      </div>

      <div className="grid grid-cols-[92px_1fr] gap-2 sm:grid-cols-[120px_1fr]">
        {/* Sidebar mock */}
        <div className="flex flex-col gap-1.5 rounded-xl bg-white/[0.03] p-2.5">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className={
                row === 1
                  ? 'flex items-center gap-1.5 rounded-md bg-[var(--color-brand)]/25 px-1.5 py-1'
                  : 'flex items-center gap-1.5 rounded-md px-1.5 py-1'
              }
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${row === 1 ? 'bg-[var(--color-brand-bright)]' : 'bg-white/15'}`}
              />
              <span
                className={`h-1.5 rounded-full ${row === 1 ? 'w-10 bg-white/40' : 'w-8 bg-white/10'}`}
              />
            </div>
          ))}
        </div>

        {/* Settings panel mock */}
        <div className="flex flex-col gap-2 rounded-xl bg-white/[0.03] p-3">
          <div className="flex items-center justify-between pb-1">
            <span className="h-2 w-24 rounded-full bg-white/25" />
            <span className="rounded-full bg-[var(--color-brand)]/30 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-brand-bright)]">
              Live
            </span>
          </div>
          {[
            { on: true, width: 'w-20' },
            { on: true, width: 'w-28' },
            { on: false, width: 'w-16' },
          ].map((toggle, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
            >
              <div className="flex flex-col gap-1.5">
                <span className={`h-1.5 ${toggle.width} rounded-full bg-white/25`} />
                <span className="h-1 w-32 max-w-full rounded-full bg-white/10" />
              </div>
              <span
                className={`flex h-4 w-7 shrink-0 items-center rounded-full px-0.5 ${
                  toggle.on ? 'justify-end bg-[var(--color-brand)]' : 'justify-start bg-white/10'
                }`}
              >
                <span className="h-3 w-3 rounded-full bg-white" />
              </span>
            </div>
          ))}
          <div className="mt-1 flex justify-end">
            <span className="rounded-full bg-[var(--color-brand-strong)] px-3 py-1 text-[9px] font-semibold text-white/90">
              Save changes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
