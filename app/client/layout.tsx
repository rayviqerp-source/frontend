import { Suspense } from "react";
import { ClientHeader } from "@/components/layout/client-header";
import { ClientBottomNav } from "@/components/layout/client-bottom-nav";

/**
 * Public client-app shell (outside the authenticated `(app)` group).
 * Clients never log in as OEM / partner / admin here — only customers do.
 * The header is session-aware: signed-in customers see only the logo and
 * their account chip (navigation lives in the bottom tab bar).
 */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* ClientHeader reads usePathname() (desktop active link) — URL data
          must sit inside a Suspense boundary or `next build` fails on the
          dynamic child routes, same as the bottom nav below. */}
      <Suspense
        fallback={
          <header className="sticky top-0 z-40 border-b border-line bg-surface/90">
            <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6 lg:max-w-6xl">
              <span className="h-6 w-28 rounded bg-surface-alt" aria-hidden />
              <span className="h-9 w-24 rounded-lg bg-surface-alt" aria-hidden />
            </div>
          </header>
        }
      >
        <ClientHeader />
      </Suspense>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-5 sm:px-6 lg:max-w-6xl">{children}</main>

      <Suspense fallback={null}>
        <ClientBottomNav />
      </Suspense>

      <footer className="border-t border-line bg-surface px-4 py-5 text-center text-[11px] text-ink-faint sm:px-6">
        RAYVIQ client app · Demo only — no real bookings, calls or payments are made.
      </footer>
    </div>
  );
}
