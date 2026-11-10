"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  MapPinned,
  Package,
  Search as SearchIcon,
  Ticket,
  UserRound,
} from "lucide-react";
import { useStore, useMyOemId } from "@/lib/store";
import { TICKET_STATUS_LABELS } from "@/lib/constants";
import { visibleTickets } from "@/lib/selectors";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

type Result =
  | { kind: "ticket"; id: string; title: string; sub: string; href: string }
  | { kind: "engineer"; id: string; title: string; sub: string; href: string }
  | { kind: "customer"; id: string; title: string; sub: string; href: string }
  | { kind: "site"; id: string; title: string; sub: string; href: string }
  | { kind: "equipment"; id: string; title: string; sub: string; href: string }
  | { kind: "oem"; id: string; title: string; sub: string; href: string };

export default function SearchPage() {
  const { state, effectiveRole } = useStore();
  const oemId = useMyOemId();
  const [q, setQ] = useState("");

  /* read ?q= after mount (avoids useSearchParams/Suspense requirement) */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("q");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed the query once from the shareable URL
    if (initial) setQ(initial);
  }, []);

  /* keep the address bar shareable without re-triggering navigation loops */
  useEffect(() => {
    const t = window.setTimeout(() => {
      const target = q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search";
      if (window.location.pathname + window.location.search !== target) {
        window.history.replaceState(null, "", target);
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [q]);

  const results = useMemo<Result[]>(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 1) return [];
    const hit = (...vals: (string | undefined | null)[]) =>
      vals.some((v) => (v ?? "").toLowerCase().includes(query));
    const out: Result[] = [];

    visibleTickets(state, effectiveRole, oemId).forEach((t) => {
      if (hit(t.ref, t.issue.category, t.issue.description, t.location.city, t.contact.name, t.product.model, t.product.serialNumber)) {
        out.push({
          kind: "ticket",
          id: t.id,
          title: `${t.ref} · ${t.issue.category}`,
          sub: `${TICKET_STATUS_LABELS[t.status]} · ${t.location.city} · ${t.priority}`,
          href: `/oem/tickets/${t.id}`,
        });
      }
    });
    state.engineers.forEach((e) => {
      if (hit(e.name, e.id, e.city, e.skills.join(" "), e.phone)) {
        out.push({
          kind: "engineer",
          id: e.id,
          title: `${e.name} (${e.id})`,
          sub: `${e.city} · ${e.skills.slice(0, 3).join(", ")} · ${e.verification.replace(/_/g, " ")}`,
          href: "/oem/engineers",
        });
      }
    });
    state.customers.forEach((c) => {
      if (hit(c.name, c.company, c.city, c.phone)) {
        out.push({
          kind: "customer",
          id: c.id,
          title: c.name,
          sub: `${c.company ?? c.type} · ${c.city}`,
          href: "/oem/customers",
        });
      }
    });
    state.sites.forEach((s) => {
      if (hit(s.name, s.city, s.address)) {
        out.push({
          kind: "site",
          id: s.id,
          title: s.name,
          sub: `${s.city} · ${s.capacityKw} kW · ${s.siteType.replace(/_/g, " ")}`,
          href: "/oem/sites",
        });
      }
    });
    state.equipment.forEach((eq) => {
      if (hit(eq.model, eq.serialNumber, eq.category)) {
        out.push({
          kind: "equipment",
          id: eq.id,
          title: `${eq.model} · ${eq.serialNumber}`,
          sub: `${eq.category.replace(/_/g, " ")} · ${eq.capacityKw} kW`,
          href: "/oem/products",
        });
      }
    });
    state.oems.forEach((o) => {
      if (hit(o.name, o.shortName, o.hqCity)) {
        out.push({
          kind: "oem",
          id: o.id,
          title: o.name,
          sub: `${o.hqCity} · ${o.subscriptionStatus}`,
          href: "/admin/oems",
        });
      }
    });
    return out.slice(0, 40);
  }, [q, state, effectiveRole, oemId]);

  const grouped = useMemo(() => {
    const g: Record<string, Result[]> = {};
    results.forEach((r) => {
      (g[r.kind] ??= []).push(r);
    });
    return g;
  }, [results]);

  const icons: Record<Result["kind"], typeof Ticket> = {
    ticket: Ticket,
    engineer: UserRound,
    customer: UserRound,
    site: MapPinned,
    equipment: Package,
    oem: Building2,
  };

  const suggestions = [
    "RVQ-2026",
    "communication failure",
    "Bengaluru",
    "Vikram",
    "string inverter",
    "Voltrix",
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Global search"
        description="Search across tickets, engineers, customers, sites, equipment and OEM organisations visible to your role."
      />

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type to search… e.g. RVQ-2026, Bengaluru, inverter"
          aria-label="Search everything"
          className="h-13 w-full rounded-xl border border-line-strong bg-surface pl-12 pr-4 text-[15px] text-ink shadow-card placeholder:text-ink-faint focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-xs text-ink-faint">Try:</span>
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setQ(s)}
            className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-soft transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
          >
            {s}
          </button>
        ))}
      </div>

      {!q.trim() ? (
        <div className="mt-6">
          <EmptyState
            icon={<SearchIcon className="h-5 w-5" />}
            title="Start typing to search"
            description="Results are scoped to what your role is allowed to see. Press ⌘K anywhere to jump to search."
          />
        </div>
      ) : results.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<SearchIcon className="h-5 w-5" />}
            title={`No results for “${q}”`}
            description="Check the spelling, or try a ticket reference, city, engineer name or serial number."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <p className="text-[13px] text-ink-muted">
            <strong className="font-semibold text-ink">{results.length}</strong> results found
          </p>
          {Object.entries(grouped).map(([kind, items]) => {
            const Icon = icons[kind as Result["kind"]];
            return (
              <div key={kind}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  {kind}s ({items.length})
                </p>
                <ul className="space-y-2">
                  {items.map((r) => (
                    <li key={`${r.kind}-${r.id}`}>
                      <Link
                        href={r.href}
                        className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-card transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-ink-faint">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{r.title}</span>
                          <span className="block truncate text-xs text-ink-muted">{r.sub}</span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
