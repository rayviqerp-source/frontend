"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { initials } from "@/lib/utils";

/**
 * Marketplace header right side — session-aware (project owner request).
 *  - workspace user signed in → "Open dashboard"
 *  - client (customer) signed in → account chip → /client/profile
 *    (a signed-in customer is never shown partner / sign-in CTAs)
 *  - guest → "Sign in" + "Open app"
 */
export function MarketplaceAuth() {
  const { state, currentUser, ready } = useStore();
  const customer = state.customers.find((c) => state.portalCustomerIds.includes(c.id)) ?? null;

  return (
    <nav className="flex items-center gap-1.5 sm:gap-3" aria-label="Marketplace">
      <a
        href="#experts"
        className="hidden rounded-lg px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-surface-alt hover:text-ink sm:block"
      >
        Browse experts
      </a>
      <a
        href="#how-it-works"
        className="hidden rounded-lg px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-surface-alt hover:text-ink sm:block"
      >
        How it works
      </a>

      {!ready ? (
        <span className="h-9 w-28 rounded-lg bg-surface-alt" aria-hidden />
      ) : currentUser ? (
        <Link
          href="/dashboard"
          className="rounded-lg bg-brand-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Open dashboard
        </Link>
      ) : customer ? (
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
      ) : (
        <>
          <Link
            href="/login"
            className="rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-alt"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Open app
          </Link>
        </>
      )}
    </nav>
  );
}
