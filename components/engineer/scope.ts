"use client";

import type { Engineer } from "@/lib/types";
import { useStore } from "@/lib/store";

/**
 * Resolves the engineer (or partner-wide scope) the signed-in demo user
 * belongs to. Falls back to sensible demo records when the user is
 * previewing a role that they do natively not hold.
 */
export function useEngineerScope(): {
  engineer: Engineer | null;
  /** All engineers in scope — one for engineers, many for partner managers. */
  scopeEngineers: Engineer[];
  isPartnerManager: boolean;
} | null {
  const { state, currentUser, effectiveRole } = useStore();

  const user = currentUser;
  const isEngineerRole = effectiveRole === "engineer" || effectiveRole === "partner_manager";
  if (!user && !state.roleOverride) return null;
  if (!isEngineerRole && !user) return null;

  const isPartnerManager = effectiveRole === "partner_manager";

  const ownEngineer =
    state.engineers.find((e) => e.id === user?.engineerId) ??
    // Role override fallback — demo impersonation needs a concrete engineer.
    (effectiveRole === "engineer" ? state.engineers[0] ?? null : null);

  const partnerId = user?.partnerId ?? ownEngineer?.partnerId ?? null;

  const scopeEngineers = isPartnerManager
    ? state.engineers.filter((e) => e.partnerId && e.partnerId === partnerId)
    : ownEngineer
      ? [ownEngineer]
      : [];

  const engineer = ownEngineer ?? scopeEngineers[0] ?? null;
  return { engineer, scopeEngineers, isPartnerManager };
}
