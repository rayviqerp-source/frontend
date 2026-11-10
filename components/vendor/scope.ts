"use client";

import { useMemo } from "react";
import type { Engineer, ServicePartner } from "@/lib/types";
import { useStore } from "@/lib/store";

/**
 * Deadline check that keeps `Date.now()` out of component render bodies
 * (react-hooks/purity). True when the deadline is in the future but closer
 * than `withinMins` minutes away.
 */
export function isExpiringSoon(iso: string, withinMins = 30): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const diff = t - Date.now();
  return diff > 0 && diff < withinMins * 60_000;
}

/**
 * Resolves the service partner (vendor) the signed-in user belongs to and
 * its engineering team. Falls back to the first partner when a demo role
 * override is active, so the vendor panel always has data to render.
 */
export function usePartnerScope(): {
  partner: ServicePartner | null;
  engineers: Engineer[];
  isDemoFallback: boolean;
} {
  const { state, currentUser } = useStore();

  return useMemo(() => {
    const userPartnerId = currentUser?.partnerId ?? null;
    const partner =
      state.partners.find((p) => p.id === userPartnerId) ??
      // Role-override / platform staff previewing the vendor workspace.
      state.partners[0] ??
      null;
    const isDemoFallback = Boolean(userPartnerId) && partner?.id !== userPartnerId;

    const engineers = partner
      ? state.engineers.filter((e) => e.partnerId === partner.id)
      : [];

    return { partner, engineers, isDemoFallback: !userPartnerId || isDemoFallback };
  }, [state.partners, state.engineers, currentUser]);
}
