"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, FileCheck2, Filter } from "lucide-react";
import { useStore, useMyOemId } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { SearchInput, Table, TBody, Td, THead, Tr, Pagination } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { downloadCsv, formatDateTime } from "@/lib/utils";

const STATUS_TABS = [
  { key: "all", label: "All", statuses: [] as string[] },
  { key: "submitted", label: "Submitted", statuses: ["submitted"] },
  { key: "clarification", label: "Clarification", statuses: ["clarification_requested"] },
  { key: "approved", label: "Approved", statuses: ["approved"] },
  { key: "rejected", label: "Rejected", statuses: ["rejected"] },
];

export default function ReportsPage() {
  const router = useRouter();
  const { state, effectiveRole, currentUser } = useStore();
  const oemId = useMyOemId();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const reports = useMemo(() => {
    const engineerIds =
      effectiveRole === "engineer"
        ? [currentUser?.engineerId ?? "ENG-01"]
        : effectiveRole === "partner_manager"
          ? state.engineers.filter((e) => e.partnerId === currentUser?.partnerId).map((e) => e.id)
          : null;
    return state.reports
      .filter((r) => {
        const ticket = state.tickets.find((t) => t.id === r.ticketId);
        if (!ticket) return false;
        if (effectiveRole === "engineer" || effectiveRole === "partner_manager") {
          return engineerIds?.includes(r.engineerId) ?? false;
        }
        return oemId ? ticket.oemId === oemId : true;
      })
      .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  }, [state.reports, state.tickets, state.engineers, effectiveRole, currentUser, oemId]);

  const rows = useMemo(() => {
    const statuses = STATUS_TABS.find((t) => t.key === tab)?.statuses ?? [];
    let list = statuses.length ? reports.filter((r) => statuses.includes(r.status)) : reports;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const ticket = state.tickets.find((t) => t.id === r.ticketId);
        return (
          r.id.toLowerCase().includes(q) ||
          (ticket?.ref ?? "").toLowerCase().includes(q) ||
          r.diagnosis.toLowerCase().includes(q) ||
          r.workPerformed.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [reports, tab, query, state.tickets]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div>
      <PageHeader
        title="Service reports"
        description="Field findings, diagnosis, work performed and evidence — each report is gated by OEM review before the ticket can complete."
        breadcrumbs={<Breadcrumbs />}
        actions={
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                "rayviq-service-reports",
                rows.map((r) => {
                  const t = state.tickets.find((x) => x.id === r.ticketId);
                  return {
                    report: r.id,
                    ticket: t?.ref ?? "",
                    engineer: state.engineers.find((e) => e.id === r.engineerId)?.name ?? r.engineerId,
                    status: r.status,
                    submittedAt: r.submittedAt,
                    diagnosis: r.diagnosis,
                    workPerformed: r.workPerformed,
                    followUp: r.followUpRequired ? "yes" : "no",
                  };
                }),
              )
            }
          >
            <Download className="h-4 w-4" aria-hidden /> Export
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto border-b border-line no-scrollbar">
          {STATUS_TABS.map((t) => {
            const count = t.statuses.length ? reports.filter((r) => t.statuses.includes(r.status)).length : reports.length;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setPage(1);
                }}
                className={`relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium ${
                  active ? "text-brand-700" : "text-ink-muted hover:text-ink"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 py-px text-[11px] font-semibold ${active ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-ink-muted"}`}>
                  {count}
                </span>
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
              </button>
            );
          })}
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search report, ticket or diagnosis…" className="w-full sm:w-72" />
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {paged.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<FileCheck2 className="h-5 w-5" />}
              title="No service reports here"
              description="Reports appear once an engineer submits findings after a field visit."
              action={query ? <Button variant="outline" onClick={() => setQuery("")}>Clear search</Button> : undefined}
            />
          </div>
        ) : (
          <>
            <Table>
              <THead
                columns={[
                  { label: "Report" },
                  { label: "Ticket" },
                  { label: "Engineer" },
                  { label: "Submitted" },
                  { label: "Flags" },
                  { label: "Status" },
                  { label: "" },
                ]}
              />
              <TBody>
                {paged.map((r) => {
                  const t = state.tickets.find((x) => x.id === r.ticketId);
                  const e = state.engineers.find((x) => x.id === r.engineerId);
                  return (
                    <Tr key={r.id} onClick={() => router.push(`/oem/reports/${r.id}`)}>
                      <Td><span className="font-mono text-[12px] font-medium text-ink">{r.id}</span></Td>
                      <Td><span className="font-mono text-[12px] text-ink-soft">{t?.ref}</span></Td>
                      <Td>
                        <p className="text-[12px] text-ink">{e?.name ?? r.engineerId}</p>
                        <p className="text-[11px] text-ink-faint">{e?.city}</p>
                      </Td>
                      <Td><span className="text-[12px]">{formatDateTime(r.submittedAt)}</span></Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {r.followUpRequired && <Badge tone="amber">Follow-up</Badge>}
                          <Badge tone={r.customerAcknowledged ? "green" : "gray"}>
                            {r.customerAcknowledged ? "Acknowledged" : "No ack"}
                          </Badge>
                          <Badge tone="gray">{r.evidence.length} files</Badge>
                        </div>
                      </Td>
                      <Td>
                        <Badge
                          tone={
                            r.status === "approved"
                              ? "green"
                              : r.status === "rejected"
                                ? "red"
                                : r.status === "clarification_requested"
                                  ? "amber"
                                  : "violet"
                          }
                        >
                          {r.status.replace(/_/g, " ")}
                        </Badge>
                      </Td>
                      <Td><ArrowRight className="h-4 w-4 text-ink-faint" aria-hidden /></Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
            <Pagination page={safePage} totalPages={totalPages} total={rows.length} onPage={setPage} pageSizeLabel={`${pageSize} per page`} />
          </>
        )}
      </div>
      <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-ink-faint">
        <Filter className="h-3 w-3" aria-hidden /> Reports are scoped to your role and OEM workspace.
      </p>
    </div>
  );
}
