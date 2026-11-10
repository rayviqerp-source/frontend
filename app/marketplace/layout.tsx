import type { Metadata } from "next";
import { BrandLogo } from "@/components/brand/logo";
import { MarketplaceAuth } from "@/components/layout/marketplace-auth";

/**
 * Marketplace public shell — approved premium UI.
 * Header right side is session-aware (see marketplace-auth.tsx).
 * See "Agent coordination" in AGENTS.md before editing.
 */

export const metadata: Metadata = {
  title: "Technician Marketplace — find solar inverter repair experts",
  description:
    "Browse verified solar inverter repair and service professionals across India. Ratings, certifications, service areas and live availability — powered by RAYVIQ.",
};

/**
 * Public (unauthenticated) shell for the UrbanClap-style technician
 * marketplace. Sits outside the `(app)` route group so no login is required.
 */
export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <BrandLogo href="/marketplace" label="Marketplace" priority />
          <MarketplaceAuth />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-[12px] text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            <span className="font-semibold text-ink">RAYVIQ</span> — OEM-first solar service operations platform.
          </p>
          <p className="text-ink-faint">
            Demo marketplace · Profiles are simulated — no real bookings, calls or payments are made.
          </p>
        </div>
      </footer>
    </div>
  );
}
