"use client";

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
 */
export function BottomNavShell() {
  const pathname = usePathname();
  const { currentUser } = useStore();

  if (pathname.startsWith("/client")) return null;
  if (!currentUser) return <ClientBottomNav />;
  return <BottomNav />;
}
