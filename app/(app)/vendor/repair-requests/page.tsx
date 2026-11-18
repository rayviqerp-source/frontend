"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  Inbox,
  MapPin,
  TimerReset,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { usePartnerScope } from "@/components/vendor/scope";
import { REPAIR_SERVICE_MODE_LABELS } from "@/lib/constants";
import { repairRequestKpis, repairRequestsForCompany } from "@/lib/selectors";
import { Badge } from "@/components/ui/badge";
import { Card, PageHeader, StatCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { SearchInput, Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RepairStatusBadge } from "@/components/repair/repair-status-badge";
import { formatDate, relativeTime } from "@/lib/utils";

type TabKey = "pending" | "accepted" | "in_progress" | "completed" | "rejected";

const TAB_STATUS: Record<TabKey, string[]> = {
  pending: ["pending"],
  accepted: ["accepted"],
  in_progress: ["in_progress"],
  completed: ["completed"],
  rejected: ["rejected"],
};

/**
 * Repair request inbox for the service partner (repair company).
 *
 * Only requests addressed to the signed-in partner are listed — the scope
 * comes from `usePartnerScope`, exactly like the rest of the vendor panel.
 */
export default function VendorRepairRequestsPage() {
  const router = useRouter();
  const { state } = useStore();
  const { partner } = usePartnerScope();
  const [tab, setTab] = useState<TabKey>("pending");
  const [query, setQuery] = useState("");

  const requests = useMemo(
    () => (partner ? repairRequestsForCompany(state, partner.id) : []),
    [state, partner],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (!TAB_STATUS[tab].includes(r.status)) return false;
      if (!q) return true;
      const customer = state.customers.find((c) => c.id === r.customerId);
      return (
        r.ref.toLowerCase().includes(q) ||
        r.problem.category.toLowerCase().includes(q) ||
        r.contact.city.toLowerCase().includes(q) ||
        (customer?.name ?? "").toLowerCase().includes(q) ||
        r.inverter.brand.toLowerCase().includes(q)
      );
    });
  }, [requests, tab, query, state.customers]);

  const kpis = repairRequestKpis(requests);

  const counts: Record<TabKey, number> = {
    pending: requests.filter((r) => r.status === "pending").length,
    accepted: requests.filter((r) => r.status === "accepted").length,
    in_progress: requests.filter((r) => r.status === "in_progress").length,
    completed: requests.filter((r) => r.status === "completed").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  if (!partner) {
    return (
      <div>
        <PageHeader title="Repair requests" breadcrumbs={<Breadcrumbs />} />
        <Card>
          <EmptyState
            icon={<Wrench className="h-5 w-5" />}
            title="No service partner linked"
            description="Sign in as Neha (USR-05 · Sunce) to preview the repair workspace."
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Inverter repair requests"
        description={`Customer repair jobs addressed to ${partner.name} — accept, decline and keep the customer informed.`}
        breadcrumbs={<Breadcrumbs />}
        actions={
          <Badge tone={counts.pending ? "amber" : "green"} dot>
            {counts.pending} awaiting response
          </Badge>
        }
      />

      {/* -------- Stats -------- */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="New requests"
          value={counts.pending}
          tone={counts.pending ? "warning" : "success"}
          icon={<Inbox className="h-4 w-4" aria-hidden />}
          hint="Waiting for your decision"
        />
        <StatCard
          label="Active jobs"
          value={counts.accepted + counts.in_progress}
          tone="brand"
          icon={<Wrench className="h-4 w-4" aria-hidden />}
          hint={`${counts.accepted} accepted · ${counts.in_progress} in progress`}
        />
        <StatCard
          label="Completed"
          value={counts.completed}
          tone="success"
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          label="Avg. response"
          value={kpis.avgAcceptanceHours ? `${kpis.avgAcceptanceHours} h` : "—"}
          icon={<Clock3 className="h-4 w-4" aria-hidden />}
          hint="Time to first decision"
        />
      </div>

      {/* -------- Tabs + search -------- */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <Tabs
          tabs={[
            { key: "pending", label: "New", count: counts.pending },
            { key: "accepted", label: "Accepted", count: counts.accepted },
            { key: "in_progress", label: "In progress", count: counts.in_progress },
            { key: "completed", label: "Completed", count: counts.completed },
            { key: "rejected", label: "Declined", count: counts.rejected },
          ]}
          active={tab}
          onChange={(k) => setTab(k as TabKey)}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search ref, customer, brand or city…"
          className="w-full sm:w-72"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<ClipboardList className="h-5 w-5" />}
              title={
                tab === "pending"
                  ? "No new requests"
                  : tab === "accepted"
                    ? "No accepted jobs"
                    : tab === "in_progress"
                      ? "Nothing in progress"
                      : tab === "completed"
                        ? "Nothing completed yet"
                        : "No declined requests"
              }
              description={`Customers pick ${partner.name} from the repair directory when they need an inverter fixed — new requests land here instantly.`}
            />
          </div>
        ) : (
          <Table>
            <THead
              columns={[
                { label: "Request" },
                { label: "Customer" },
                { label: "Inverter" },
                { label: "Problem" },
                { label: "Service" },
                { label: "Received" },
                { label: "Status" },
              ]}
            />
            <TBody>
              {filtered.map((r) => {
                const customer = state.customers.find((c) => c.id === r.customerId);
                return (
                  <Tr key={r.id} onClick={() => router.push(`/vendor/repair-requests/${r.id}`)}>
                    <Td>
                      <p className="font-mono text-[12px] font-medium text-ink">{r.ref}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-faint">
                        <MapPin className="h-3 w-3" aria-hidden /> {r.contact.city}
                      </p>
                    </Td>
                    <Td>
                      <p className="text-[13px] text-ink-soft">
                        {customer?.name ?? r.contact.name}
                      </p>
                      <p className="text-[11px] text-ink-faint">{r.contact.phone}</p>
                    </Td>
                    <Td>
                      <p className="text-[12.5px] text-ink-soft">{r.inverter.brand}</p>
                      <p className="text-[11px] text-ink-faint">
                        {r.inverter.model ?? "—"}
                        {r.inverter.capacityKw ? ` · ${r.inverter.capacityKw} kW` : ""}
                      </p>
                    </Td>
                    <Td className="max-w-56">
                      <p className="truncate text-[13px] text-ink-soft">{r.problem.category}</p>
                      <p className="truncate text-[11px] text-ink-faint">{r.problem.description}</p>
                    </Td>
                    <Td>
                      <span className="text-[12px] text-ink-soft">
                        {REPAIR_SERVICE_MODE_LABELS[r.serviceMode ?? ""] ?? "On-site visit"}
                      </span>
                      {r.preferredDate && (
                        <p className="text-[11px] text-ink-faint">{formatDate(r.preferredDate)}</p>
                      )}
                    </Td>
                    <Td>
                      <span className="whitespace-nowrap text-[12px] text-ink-muted">
                        {relativeTime(r.createdAt)}
                      </span>
                    </Td>
                    <Td>
                      <RepairStatusBadge status={r.status} />
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </div>

      {/* -------- Note -------- */}
      <Card className="mt-6">
        <p className="flex items-start gap-2 text-[13px] leading-6 text-ink-muted">
          <TimerReset className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
          Declining a request needs a reason — the customer sees it on the tracker and can
          raise the job with another company. Warranty replacements stay with the inverter
          manufacturer.
        </p>
      </Card>
    </div>
  );
}
