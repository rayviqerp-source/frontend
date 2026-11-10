"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, Ticket as TicketIcon, TimerReset, UserX } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  OPEN_STATUSES,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TONES,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Pagination, SearchInput, Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { downloadCsv, formatDate, isOverdue } from "@/lib/utils";

const PAGE_SIZE = 12;

export default function AdminTicketsPage() {
  const router = useRouter();
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [oem, setOem] = useState("");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.tickets
      .filter((t) => {
        if (status && t.status !== status) return false;
        if (priority && t.priority !== priority) return false;
        if (oem && t.oemId !== oem) return false;
        if (!q) return true;
        const customer = state.customers.find((c) => c.id === t.customerId);
        return (
          t.ref.toLowerCase().includes(q) ||
          t.issue.category.toLowerCase().includes(q) ||
          t.location.city.toLowerCase().includes(q) ||
          (customer?.name ?? "").toLowerCase().includes(q) ||
          t.product.serialNumber.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        return a.createdAt < b.createdAt ? 1 : -1;
      });
  }, [state.tickets, state.customers, query, status, priority, oem]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const open = rows.filter((t) => OPEN_STATUSES.includes(t.status));
  const breached = open.filter((t) => t.sla.breached || isOverdue(t.sla.resolutionDueAt));
  const unassigned = open.filter((t) => !t.assignedEngineerId);
  const escalated = state.escalations.filter((e) => e.status !== "resolved");

  const exportRows = () =>
    downloadCsv(
      "rayviq-platform-tickets",
      rows.map((t) => ({
        ref: t.ref,
        oem: state.oems.find((o) => o.id === t.oemId)?.name ?? t.oemId,
        customer: state.customers.find((c) => c.id === t.customerId)?.name ?? "",
        city: t.location.city,
        priority: t.priority,
        status: t.status,
        engineer: state.engineers.find((e) => e.id === t.assignedEngineerId)?.name ?? "",
        slaBreached: t.sla.breached,
        createdAt: t.createdAt,
        resolutionDueAt: t.sla.resolutionDueAt,
      })),
    );

  return (
    <div>
      <PageHeader
        title="Platform tickets"
        description="Read-only oversight across every OEM tenant. Use Assignment Operations to intervene; warranty and repair decisions remain with each OEM."
        breadcrumbs={<Breadcrumbs />}
        actions={<Button variant="outline" onClick={exportRows}><Download className="h-4 w-4" aria-hidden /> Export</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="All tickets" value={rows.length} hint={`${open.length} open · ${rows.length - open.length} closed`} icon={<TicketIcon className="h-4 w-4" />} tone="brand" />
        <StatCard label="SLA at risk" value={breached.length} hint={`${open.filter((t) => t.priority === "critical").length} critical open`} icon={<AlertTriangle className="h-4 w-4" />} tone={breached.length ? "danger" : "success"} />
        <StatCard label="Unassigned" value={unassigned.length} hint="Awaiting an engineer offer" icon={<UserX className="h-4 w-4" />} tone={unassigned.length ? "warning" : "success"} />
        <StatCard label="Open escalations" value={escalated.length} hint={`${escalated.filter((e) => e.level === 3).length} level 3`} icon={<TimerReset className="h-4 w-4" />} tone={escalated.length ? "danger" : "success"} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search ref, issue, customer, serial or city…" className="w-full sm:w-80" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All statuses" options={Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => ({ value, label }))} className="w-44" />
        <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} placeholder="All priorities" options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))} className="w-38" />
        <Select value={oem} onChange={(e) => { setOem(e.target.value); setPage(1); }} placeholder="All OEMs" options={state.oems.map((o) => ({ value: o.id, label: o.shortName }))} className="w-40" />
        <span className="ml-auto pb-1 text-[11px] text-ink-faint">{rows.length} tickets</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {rows.length === 0 ? (
          <div className="p-4"><EmptyState icon={<TicketIcon className="h-5 w-5" />} title="No tickets match" description="Try a different OEM, status or priority." /></div>
        ) : (
          <>
            <Table>
              <THead columns={[{ label: "Ticket" }, { label: "OEM" }, { label: "Customer / site" }, { label: "Priority" }, { label: "Engineer" }, { label: "SLA" }, { label: "Created" }, { label: "Status" }]} />
              <TBody>
                {paged.map((t) => {
                  const customer = state.customers.find((c) => c.id === t.customerId);
                  const ticketOem = state.oems.find((o) => o.id === t.oemId);
                  const engineer = state.engineers.find((e) => e.id === t.assignedEngineerId);
                  const overdue = t.sla.breached || (OPEN_STATUSES.includes(t.status) && isOverdue(t.sla.resolutionDueAt));
                  return (
                    <Tr key={t.id} onClick={() => router.push(`/oem/tickets/${t.id}`)}>
                      <Td>
                        <p className="font-mono text-[11px] font-medium text-ink">{t.ref}</p>
                        <p className="max-w-48 truncate text-[11px] text-ink-faint">{t.issue.category}</p>
                      </Td>
                      <Td><span className="text-[12px] text-ink-soft">{ticketOem?.shortName ?? t.oemId}</span></Td>
                      <Td>
                        <p className="text-[12px] text-ink-soft">{customer?.name ?? "—"}</p>
                        <p className="text-[11px] text-ink-faint">{t.location.city}, {t.location.state}</p>
                      </Td>
                      <Td><Badge tone={t.priority === "critical" ? "red" : t.priority === "high" ? "amber" : t.priority === "medium" ? "blue" : "gray"}>{PRIORITY_LABELS[t.priority]}</Badge></Td>
                      <Td><span className="text-[12px] text-ink-soft">{engineer?.name ?? <span className="text-ink-faint">Unassigned</span>}</span></Td>
                      <Td>{overdue ? <Badge tone="red" dot>Breached</Badge> : <Badge tone="green">On track</Badge>}</Td>
                      <Td><span className="text-[11px] text-ink-faint">{formatDate(t.createdAt)}</span></Td>
                      <Td><Badge tone={TICKET_STATUS_TONES[t.status]} dot>{TICKET_STATUS_LABELS[t.status]}</Badge></Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
            <Pagination page={safePage} totalPages={totalPages} total={rows.length} onPage={setPage} pageSizeLabel={`${PAGE_SIZE} per page`} />
          </>
        )}
      </div>
    </div>
  );
}
