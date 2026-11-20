"use client";

import Link from "next/link";
import {
  ChevronRight,
  ClipboardList,
  MapPin,
  UserRound,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useActiveCustomer } from "@/lib/session";
import { REPAIR_SERVICE_MODE_LABELS } from "@/lib/constants";
import { repairRequestsForCustomer } from "@/lib/selectors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { RepairStatusBadge } from "@/components/repair/repair-status-badge";
import { cn, relativeTime } from "@/lib/utils";

/**
 * Customer repair-request list — every repair request raised by the
 * signed-in customer, newest first, with its live status.
 */
export default function ClientRepairRequestsPage() {
  const { state } = useStore();

  const customer = useActiveCustomer();

  if (!customer) {
    return (
      <Card className="p-5">
        <EmptyState
          icon={<UserRound className="h-5 w-5" />}
          title="You're not signed in"
          description="Sign in with your mobile number to see your repair requests."
          action={
            <Link href="/client/login">
              <Button>Sign in to client app</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const requests = repairRequestsForCustomer(state, customer.id);
  const openCount = requests.filter(
    (r) => r.status === "pending" || r.status === "accepted" || r.status === "in_progress",
  ).length;
  const doneCount = requests.filter((r) => r.status === "completed").length;

  return (
    <div className="space-y-4">
      {/* ---------- Compact hero ---------- */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink via-brand-900 to-brand-800 p-4 text-white sm:p-5">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand-500/30 blur-3xl" />
        </div>
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/20">
            <MapPin className="h-3 w-3 text-accent-400" aria-hidden />
            {customer.city}, {customer.state}
          </span>
          <h1 className="mt-2.5 text-xl font-bold tracking-tight sm:text-2xl">
            My repair requests
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-white/75">
            {requests.length} request{requests.length === 1 ? "" : "s"} raised by{" "}
            <span className="font-semibold text-white">{customer.name}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-xl bg-white/10 px-2.5 py-1.5 ring-1 ring-white/10">
              <span className="block text-[9.5px] font-semibold uppercase tracking-widest text-white/50">
                Open
              </span>
              <span className="block text-[15px] font-bold text-brand-300">{openCount}</span>
            </span>
            <span className="rounded-xl bg-white/10 px-2.5 py-1.5 ring-1 ring-white/10">
              <span className="block text-[9.5px] font-semibold uppercase tracking-widest text-white/50">
                Done
              </span>
              <span className="block text-[15px] font-bold text-success-300">{doneCount}</span>
            </span>
          </div>
        </div>
      </section>

      {requests.length === 0 ? (
        <Card className="p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
            <ClipboardList className="h-6 w-6 text-brand-600" aria-hidden />
          </span>
          <h2 className="mt-3 text-[15px] font-semibold text-ink">No repair requests yet</h2>
          <p className="mx-auto mt-1 max-w-xs text-[13px] leading-6 text-ink-muted">
            Request a repair from a verified company — inverter, battery or other equipment — and track progress here.
          </p>
          <div className="mt-4 flex justify-center">
            <Link href="/client/repair">
              <Button size="sm">
                <Wrench className="h-3.5 w-3.5" aria-hidden /> Request a repair
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
          {requests.map((r) => {
            const company = state.partners.find((p) => p.id === r.companyId);
            const isActive =
              r.status === "pending" || r.status === "accepted" || r.status === "in_progress";
            return (
              <li key={r.id}>
                <Link
                  href={`/client/repairs/${r.id}`}
                  className={cn(
                    "group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-pop",
                    !isActive && "opacity-85",
                  )}
                >
                  <div className="flex items-center gap-1.5 border-b border-line/60 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-medium text-ink-muted">
                      {r.ref}
                    </span>
                    <span className="ml-auto shrink-0">
                      <RepairStatusBadge status={r.status} className="text-[10px]" />
                    </span>
                  </div>

                  <div className="px-3 pt-2.5">
                    <p className="truncate text-[13.5px] font-semibold leading-5 tracking-tight text-ink">
                      {r.problem.category}
                    </p>
                    <p className="mt-0.5 truncate text-[11.5px] text-ink-faint">
                      {r.inverter.brand}
                      {r.inverter.model ? ` · ${r.inverter.model}` : ""}
                      {r.inverter.capacityKw ? ` · ${r.inverter.capacityKw} kW` : ""}
                    </p>
                  </div>

                  <div className="space-y-1 px-3 pt-2.5">
                    <p className="flex items-center gap-1 truncate text-[11.5px] text-ink-muted">
                      <Wrench className="h-3 w-3 shrink-0 text-ink-faint" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{company?.name ?? "Repair company"}</span>
                    </p>
                    <p className="flex items-center gap-1 truncate text-[11.5px] text-ink-muted">
                      <MapPin className="h-3 w-3 shrink-0 text-ink-faint" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{r.contact.city}</span>
                    </p>
                  </div>

                  <p className="mt-2 line-clamp-2 px-3 text-[11.5px] leading-5 text-ink-soft">
                    {r.problem.description}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-1.5 border-t border-line/60 px-3 py-2">
                    <Badge tone="gray" className="max-w-[120px] truncate text-[10px]">
                      {REPAIR_SERVICE_MODE_LABELS[r.serviceMode ?? ""] ?? "On-site visit"}
                    </Badge>
                    <span className="inline-flex items-center gap-0.5 text-[11.5px] text-ink-faint">
                      {relativeTime(r.updatedAt)}
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* ---------- Quick action ---------- */}
      <Card className="p-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50">
            <Wrench className="h-4 w-4 text-brand-600" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-ink">Another inverter faulty?</p>
            <p className="text-[11.5px] text-ink-muted">Send a request to a repair company in a minute.</p>
          </div>
          <Link href="/client/repair" className="shrink-0">
            <Button variant="outline" size="sm">
              New request <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
