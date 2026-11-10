"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/logo";
import { useStore } from "@/lib/store";
import { cn, initials } from "@/lib/utils";

/* Desktop header links — mobile uses the bottom tab bar instead. */
const CLIENT_LINKS = [
  { href: "/client", label: "Home" },
  { href: "/client/bookings", label: "Bookings" },
  { href: "/marketplace", label: "Experts" },
];

/**
 * Client app header. Navigation lives in the bottom tab bar on mobile, so the
 * header stays minimal there; on desktop (lg+) the layout widens to full
 * width and the header shows inline links next to the account chip.
 *  - signed in  → desktop links + account chip (first name + avatar)
 *  - signed out → logo + Experts link + Sign-in button
 * The project owner asked for the Experts / My Profile links to disappear
 * from the header once the customer is signed in on mobile — the bottom nav
 * already covers Home / Bookings / My Profile there.
 */
export function ClientHeader() {
  const { state, ready } = useStore();
  const pathname = usePathname();

  /*
   * The Suspense boundary around this header (layout.tsx) makes it hydrate in
   * its own selective-hydration window — the store effect may already have
   * flipped `ready` to true by then, which would render a different branch
   * than the server HTML (skeleton) and fail hydration. Gate on `mounted` so
   * the first client render is always the skeleton the server rendered.
   */
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flag, same pattern as the store's localStorage hydration
  useEffect(() => setMounted(true), []);

  const customer = state.customers.find((c) => state.portalCustomerIds.includes(c.id)) ?? null;
  const signedIn = ready && customer !== null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6 lg:max-w-6xl">
        <BrandLogo href={signedIn ? "/client" : "/client/login"} label="Client" priority />

        {!mounted || !ready ? (
          /* Avoid a wrong-state flash while the store rehydrates */
          <span className="h-9 w-24 rounded-lg bg-surface-alt" aria-hidden />
        ) : signedIn && customer ? (
          <div className="flex items-center gap-1.5 sm:gap-3">
            <nav className="hidden items-center gap-1 sm:flex" aria-label="Client">
              {CLIENT_LINKS.map(({ href, label }) => {
                const active =
                  href === "/client" ? pathname === "/client" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-brand-50 font-semibold text-brand-700"
                        : "text-ink-soft hover:bg-surface-alt hover:text-ink",
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
            <Link
              href="/client/profile"
              className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 shadow-card transition-colors hover:border-brand-300"
              aria-label="Open my profile"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-[12px] font-bold text-white"
                aria-hidden
              >
                {initials(customer.name)}
              </span>
              <span className="text-[13px] font-semibold text-ink">{customer.name.split(" ")[0]}</span>
            </Link>
          </div>
        ) : (
          <nav className="flex items-center gap-1.5" aria-label="Client">
            <Link
              href="/marketplace"
              className="rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-surface-alt hover:text-ink"
            >
              Experts
            </Link>
            <Link
              href="/client/login"
              className="rounded-lg bg-brand-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Sign in
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
