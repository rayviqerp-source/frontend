"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Download,
  Filter,
  MapPin,
  Plus,
  Ticket as TicketIcon,
  X,
} from "lucide-react";
import { useStore, useMyOemId } from "@/lib/store";
import {
  PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from "@/lib/constants";
import { can } from "@/lib/permissions";
import { visibleTickets } from "@/lib/selectors";
import { downloadCsv, formatDate, isOverdue } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/ui/card";
import { PriorityBadge, StatusBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import {
  Pagination,
  SearchInput,
  SortHeader,
  TBody,
  Td,
  Table,
  Tr,
  useTableControls,
  type SortState,
} from "@/components/ui/table";
import type { Ticket } from "@/lib/types";

type SortKey = "ref" | "status" | "priority" | "createdAt" | "dueAt" | "city";

const PRIORITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

const TABS: { key: string; label: string; test: (t: Ticket) => boolean }[] = [
  { key: "open", label: "Open", test: (t) => t.status !== "closed" && t.status !== "completed" },
  { key: "attention", label: "Needs attention", test: (t) => isOverdue(t.dueAt) && t.status !== "closed" && t.status !== "completed" },
  { key: "awaiting", label: "Awaiting review", test: (t) => t.status === "awaiting_oem_review" || t.status === "report_submitted" },
  { key: "completed", label: "Completed", test: (t) => t.status === "completed" || t.status === "closed" },
  { key: "all", label: "All", test: () => true },
];

export default function OemTicketsPage() {
  const { state, effectiveRole } = useStore();
  const oemId = useMyOemId();
  const router = useRouter();
  const [tab, setTab] = useState("open");

  const scoped = useMemo(
    () => visibleTickets(state, effectiveRole, oemId),
    [state, effectiveRole, oemId],
  );

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
  const rows = scoped.filter(activeTab.test);

  const controls = useTableControls<Ticket & { city: string; priorityRank: number }>({
    rows: rows.map((t) => ({ ...t, city: t.location.city, priorityRank: PRIORITY_RANK[t.priority] })),
    searchKeys: ["ref", "issue", "city", "contact"] as never,
    initialSort: { key: "dueAt", dir: "asc" } as SortState<SortKey>,
    pageSize: 10,
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    TABS.forEach((t) => (c[t.key] = scoped.filter(t.test).length));
    return c;
  }, [scoped]);

  const kpis = {
    open: counts.open,
    overdue: counts.attention,
    review: counts.awaiting,
    completed: counts.completed,
  };

  const exportCsv = () => {
    downloadCsv(
      "rayviq-tickets.csv",
      controls.filtered.map((t) => ({
        ref: t.ref,
        status: TICKET_STATUS_LABELS[t.status],
        priority: PRIORITY_LABELS[t.priority],
        category: t.issue.category,
        city: t.location.city,
        created: t.createdAt,
        due: t.dueAt,
      })),
    );
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Tickets"
        description="Every service ticket for your organisation — with SLA countdowns, assignment state and lifecycle history."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={controls.filtered.length === 0}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            {can(effectiveRole, "oem.tickets.create") && (
              <Link href="/oem/tickets/new">
                <Button>
                  <Plus className="h-4 w-4" /> New ticket
                </Button>
              </Link>
            )}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Open" value={kpis.open} hint="Active in lifecycle" icon={<TicketIcon className="h-4 w-4" />} tone="brand" />
        <StatCard label="Overdue" value={kpis.overdue} hint="Past resolution due" icon={<AlertTriangle className="h-4 w-4" />} tone={kpis.overdue ? "danger" : "success"} />
        <StatCard label="Awaiting review" value={kpis.review} hint="Reports to action" icon={<Filter className="h-4 w-4" />} />
        <StatCard label="Completed" value={kpis.completed} hint="Done + closed" icon={<ArrowUpRight className="h-4 w-4" />} tone="success" />
      </div>

      <Tabs
        active={tab}
        onChange={(k) => {
          setTab(k);
          controls.setPage(1);
        }}
        tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: counts[t.key] }))}
        className="mb-4"
      />

      <div className="rounded-xl border border-line bg-surface shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <SearchInput
            value={controls.query}
            onChange={controls.setQuery}
            placeholder="Search ref, issue, city, contact…"
            className="w-full sm:max-w-xs"
          />
          <select
            value={controls.filters.status ?? ""}
            onChange={(e) => controls.setFilter("status", e.target.value)}
            aria-label="Filter by status"
            className="h-9.5 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] text-ink-soft focus:border-brand-400 focus:outline-none"
          >
            <option value="">All statuses</option>
            {Object.entries(TICKET_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={controls.filters.priority ?? ""}
            onChange={(e) => controls.setFilter("priority", e.target.value)}
            aria-label="Filter by priority"
            className="h-9.5 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] text-ink-soft focus:border-brand-400 focus:outline-none"
          >
            <option value="">All priorities</option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {(controls.query || Object.values(controls.filters).some(Boolean)) && (
            <Button variant="ghost" size="sm" onClick={controls.reset}>
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
          <span className="ml-auto text-[13px] text-ink-muted">
            {controls.total} matching
          </span>
        </div>

        <Table>
          <thead>
            <tr className="border-b border-line bg-surface-alt/70">
              <SortHeader label="Ticket" field="ref" sort={controls.sort} onSort={controls.toggleSort} />
              <SortHeader label="Status" field="status" sort={controls.sort} onSort={controls.toggleSort} />
              <SortHeader label="Priority" field="priority" sort={controls.sort} onSort={controls.toggleSort} />
              <th scope="col" className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Issue / City</th>
              <SortHeader label="Created" field="createdAt" sort={controls.sort} onSort={controls.toggleSort} />
              <SortHeader label="Due" field="dueAt" sort={controls.sort} onSort={controls.toggleSort} />
              <th scope="col" className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Engineer</th>
            </tr>
          </thead>
          <TBody>
            {controls.paged.map((t) => {
              const engineer = state.engineers.find((e) => e.id === t.assignedEngineerId);
              const overdue = isOverdue(t.dueAt) && t.status !== "closed" && t.status !== "completed";
              return (
                <Tr key={t.id} onClick={() => router.push(`/oem/tickets/${t.id}`)}>
                  <Td>
                    <span className="font-mono text-[13px] font-medium text-brand-700">{t.ref}</span>
                    <span className="mt-0.5 block text-[11px] text-ink-faint">{t.source}</span>
                  </Td>
                  <Td>
                    <StatusBadge status={t.status} />
                  </Td>
                  <Td>
                    <PriorityBadge priority={t.priority} />
                  </Td>
                  <Td>
                    <span className="block max-w-52 truncate text-[13px] text-ink">{t.issue.category}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted">
                      <MapPin className="h-3 w-3" /> {t.location.city}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-xs">{formatDate(t.createdAt)}</Td>
                  <Td className="whitespace-nowrap text-xs">
                    <span className={overdue ? "font-semibold text-danger-600" : ""}>
                      {formatDate(t.dueAt)}
                    </span>
                    {overdue && <span className="ml-1 text-[10px] font-bold uppercase">overdue</span>}
                  </Td>
                  <Td>
                    {engineer ? (
                      <span className="text-[13px] text-ink-soft">{engineer.name}</span>
                    ) : (
                      <Badge tone="amber">Unassigned</Badge>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>

        {controls.filtered.length === 0 && (
          <div className="p-5">
            <EmptyState
              icon={<TicketIcon className="h-5 w-5" />}
              title="No tickets match"
              description="Adjust filters, or create a new ticket to get started."
              action={
                can(effectiveRole, "oem.tickets.create") ? (
                  <Link href="/oem/tickets/new">
                    <Button size="sm">
                      <Plus className="h-4 w-4" /> New ticket
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          </div>
        )}

        <Pagination
          page={controls.page}
          totalPages={controls.totalPages}
          total={controls.total}
          onPage={controls.setPage}
        />
      </div>
    </div>
  );
}
