"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { BottomNav } from "./bottom-nav";
import { ClientBottomNav } from "./client-bottom-nav";

/**
 * Chooses the right bottom navigation for the current visitor:
 *  - `/client/**` → the customer app has its own navigation (rendered in its layout),
 *  - signed-in workspace user (OEM / partner / admin) → the role-aware workspace nav,
 *  - anonymous visitor on public pages → the customer-facing nav, because the
 *    "My Profile" tab there belongs to the client, not to an OEM/partner account.
 *
 * The choice depends on the session, and the session only exists in the
 * browser (the store hydrates it from localStorage in an effect). The server
 * therefore always renders the customer-facing nav. Because this component
 * sits in a Suspense boundary in the root layout, it hydrates in its own
 * selective-hydration window — the store effect may already have resolved a
 * signed-in user by then, which would render a different branch than the
 * server HTML and fail hydration.
 *
 * So we hold the server branch until the component has mounted, exactly like
 * `components/layout/client-header.tsx` does for the same reason.
 */
export function BottomNavShell() {
  const pathname = usePathname();
  const { currentUser } = useStore();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flag, same pattern as the client header's hydration guard
  useEffect(() => setMounted(true), []);

  if (pathname.startsWith("/client")) return null;
  if (!mounted || !currentUser) return <ClientBottomNav />;
  return <BottomNav />;
}
