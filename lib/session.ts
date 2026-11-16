"use client";

import { useMemo } from "react";
import { useStore } from "./store";
import type { Customer, Engineer, Ticket } from "./types";
import { OPEN_STATUSES } from "./constants";

/**
 * The customer the client app is currently signed in as.
 *
 * The desktop customer portal can keep several preview sessions open at once
 * (`portalCustomerIds`), so the client app tracks the active customer
 * separately (`portalCustomerId`). Falling back to the first customer in the
 * session list keeps the app working for state persisted before the active
 * customer was tracked.
 */
export function useActiveCustomer(): Customer | null {
  const { state } = useStore();

  return useMemo(() => {
    if (state.portalCustomerId) {
      return state.customers.find((c) => c.id === state.portalCustomerId) ?? null;
    }
    return state.customers.find((c) => state.portalCustomerIds.includes(c.id)) ?? null;
  }, [state.customers, state.portalCustomerId, state.portalCustomerIds]);
}

/**
 * Resolve the engineer record for the signed-in user. Falls back to the first
 * engineer when a demo role override is active, so every portal has data.
 */
export function useMyEngineerId(): string | null {
  const { currentUser, effectiveRole, state } = useStore();
  if (currentUser?.engineerId) return currentUser.engineerId;
  if (effectiveRole !== "engineer" && effectiveRole !== "partner_manager") return null;
  if (currentUser?.partnerId) {
    const partnerEngineer = state.engineers.find((e) => e.partnerId === currentUser.partnerId);
    if (partnerEngineer) return partnerEngineer.id;
  }
  return state.engineers[0]?.id ?? null;
}

export function useMyEngineer(): Engineer | null {
  const engineerId = useMyEngineerId();
  const { state } = useStore();
  return state.engineers.find((e) => e.id === engineerId) ?? null;
}

/** Tickets belonging to the active engineer or partner. */
export function useEngineerTickets(): {
  engineer: Engineer | null;
  tickets: Ticket[];
  offers: Ticket[];
  active: Ticket[];
  completed: Ticket[];
} {
  const engineer = useMyEngineer();
  const { state, effectiveRole, currentUser } = useStore();

  return useMemo(() => {
    if (!engineer) {
      return { engineer: null, tickets: [], offers: [], active: [], completed: [] };
    }
    const partnerIds =
      effectiveRole === "partner_manager" && currentUser?.partnerId
        ? state.engineers.filter((e) => e.partnerId === currentUser.partnerId).map((e) => e.id)
        : [engineer.id];

    const tickets = state.tickets
      .filter((t) => t.assignedEngineerId && partnerIds.includes(t.assignedEngineerId))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

    return {
      engineer,
      tickets,
      offers: tickets.filter((t) => t.status === "offered"),
      active: tickets.filter(
        (t) =>
          OPEN_STATUSES.includes(t.status) &&
          t.status !== "offered" &&
          t.status !== "rejected" &&
          t.status !== "awaiting_assignment",
      ),
      completed: tickets.filter((t) => t.status === "completed" || t.status === "closed"),
    };
  }, [engineer, state.tickets, state.engineers, effectiveRole, currentUser]);
}
