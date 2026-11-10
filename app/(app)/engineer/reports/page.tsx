"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ClipboardList, FileText, Send, Undo2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useEngineerScope } from "@/components/engineer/scope";
import { ReportModal } from "@/components/engineer/report-modal";
import { OPEN_STATUSES } from "@/lib/constants";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { Drawer } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/states";
import { Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Ticket } from "@/lib/types";

const REPORT_STATUS_TONES: Record<string, "gray" | "blue" | "cyan" | "amber" | "violet" | "green" | "red"> = {
  draft: "gray",
  submitted: "violet",
  clarification_requested: "amber",
  approved: "green",
  rejected: "red",
};

export default function EngineerReportsPage() {
  const { state, submitReport } = useStore();
  const scope = useEngineerScope();

  const [reportTicket, setReportTicket] = useState<Ticket | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const scopeIds = useMemo(() => scope?.scopeEngineers.map((e) => e.id) ?? [], [scope]);

  /* Reports authored inside my scope */
  const myReports = useMemo(
    () =>
      state.reports
        .filter((r) => scopeIds.includes(r.engineerId))
        .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1)),
    [state, scopeIds],
  );

  /**
   * Active report for a ticket = submitted or clarification_requested
   * (an approved / rejected report no longer blocks a fresh submission).
   */
  const hasActiveReport = (ticket: Ticket) =>
    state.reports.some(
      (r) => r.ticketId === ticket.id && (r.status === "submitted" || r.status === "clarification_requested"),
    );

  /* Tickets with a completed site visit but no report in flight yet */
  const awaitingReport = useMemo(
    () =>
      state.tickets.filter(
        (t) =>
          OPEN_STATUSES.includes(t.status) &&
          scopeIds.includes(t.assignedEngineerId ?? "") &&
          state.visits.some((v) => v.ticketId === t.id && v.status === "completed") &&
          !hasActiveReport(t),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, scopeIds],
  );

  const awaitingReview = state.tickets.filter(
    (t) =>
      scopeIds.includes(t.assignedEngineerId ?? "") &&
      (t.status === "report_submitted" || t.status === "awaiting_oem_review" || t.status === "clarification_required"),
  );

  const clarificationTickets = awaitingReport.filter((t) => t.status === "clarification_required");

  const detail = detailId ? state.reports.find((r) => r.id === detailId) ?? null : null;
  const ticketOf = (ticketId: string) => state.tickets.find((t) => t.id === ticketId);

  if (!scope || scope.scopeEngineers.length === 0) {
    return (
      <div>
        <PageHeader
          title="Service reports"
          description="Submit structured field reports with findings, diagnosis, parts and evidence for OEM review."
          breadcrumbs={<Breadcrumbs />}
        />
        <Card>
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title="No engineer account linked"
            description="This demo account does not have an engineer profile linked. Sign in as Vikram (USR-04) to preview the engineer workspace."
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Service reports"
        description="Submit structured field reports with findings, diagnosis, parts and evidence for OEM review."
        breadcrumbs={<Breadcrumbs />}
        actions={
          <Badge tone={scope.isPartnerManager ? "cyan" : "blue"}>
            {scope.isPartnerManager
              ? `Partner scope · ${scope.scopeEngineers.length} engineers`
              : scope.engineer?.name ?? "Engineer"}
          </Badge>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Reports awaiting OEM review" value={awaitingReview.filter((t) => t.status !== "clarification_required").length} tone="brand" icon={<Send className="h-4 w-4" aria-hidden />} />
        <StatCard label="Clarifications requested" value={clarificationTickets.length} tone={clarificationTickets.length ? "warning" : "default"} icon={<Undo2 className="h-4 w-4" aria-hidden />} />
        <StatCard label="Approved" value={myReports.filter((r) => r.status === "approved").length} tone="success" icon={<BadgeCheck className="h-4 w-4" aria-hidden />} />
        <StatCard label="Total submitted" value={myReports.length} icon={<ClipboardList className="h-4 w-4" aria-hidden />} />
      </div>

      {/* Awaiting submission */}
      <Card className="mb-6">
        <CardHeader
          title="Ready to report"
          description="Completed site visits that still need a technical service report."
        />
        {awaitingReport.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title="Nothing pending"
            description="Every completed visit already has a report in flight. Close a new visit from the Visits page to unlock the next report."
          />
        ) : (
          <ul className="space-y-2.5">
            {awaitingReport.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-alt px-3.5 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[12px] font-semibold text-ink">{t.ref}</span>
                    <PriorityBadge priority={t.priority} />
                    <Badge tone={t.status === "clarification_required" ? "amber" : "blue"} dot>
                      {t.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-ink-soft">
                    {t.issue.category} · {t.location.city} · customer {t.contact.name}
                  </p>
                  {t.status === "clarification_required" && (
                    <p className="mt-1 truncate text-[12px] text-warning-700">
                      OEM remark:{" "}
                      {state.reports.find((r) => r.id === t.reportId)?.reviewRemark ?? "—"}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/oem/tickets/${t.id}`}>
                    <Button variant="outline" size="sm">Ticket</Button>
                  </Link>
                  <Button size="sm" onClick={() => setReportTicket(t)}>
                    <Send className="h-3.5 w-3.5" aria-hidden />
                    {t.status === "clarification_required" ? "Re-submit report" : "Write report"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Submitted report history */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {myReports.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title="No reports submitted yet"
              description="Reports you submit below will be visible here with their review status."
            />
          </div>
        ) : (
          <Table>
            <THead
              columns={[
                { label: "Ticket" },
                { label: "Submitted" },
                { label: "Diagnosis" },
                { label: "Evidence" },
                { label: "Status" },
                { label: "Review remark" },
              ]}
            />
            <TBody>
              {myReports.map((r) => {
                const t = ticketOf(r.ticketId);
                return (
                  <Tr key={r.id} onClick={() => setDetailId(r.id)}>
                    <Td>
                      <span className="font-mono text-[12px] font-medium text-ink">{t?.ref ?? "—"}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-faint">{t?.issue.category}</span>
                    </Td>
                    <Td><span className="text-[12px]">{formatDateTime(r.submittedAt)}</span></Td>
                    <Td className="max-w-56">
                      <p className="truncate text-[12px]">{r.diagnosis}</p>
                    </Td>
                    <Td>
                      <span className="text-[12px]">
                        {r.evidence.length > 0 ? `${r.evidence.length} file${r.evidence.length === 1 ? "" : "s"}` : "—"}
                      </span>
                    </Td>
                    <Td>
                      <Badge tone={REPORT_STATUS_TONES[r.status] ?? "gray"} dot>
                        {r.status.replace(/_/g, " ")}
                      </Badge>
                    </Td>
                    <Td className="max-w-64">
                      {r.reviewRemark ? (
                        <span className="truncate text-[12px] text-warning-700">{r.reviewRemark}</span>
                      ) : (
                        <span className="text-[11px] text-ink-faint">
                          {r.reviewedAt ? `Reviewed ${formatDate(r.reviewedAt)}` : "Awaiting OEM review"}
                        </span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </div>

      {/* Submit modal */}
      {reportTicket && (
        <ReportModal
          ticket={reportTicket}
          reviewRemark={
            state.reports.find((r) => r.id === reportTicket.reportId)?.reviewRemark ?? undefined
          }
          onClose={() => setReportTicket(null)}
          onSubmit={(body) => {
            submitReport(reportTicket.id, body);
            setReportTicket(null);
          }}
        />
      )}

      {/* Report detail drawer */}
      <Drawer
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail ? `Report — ${ticketOf(detail.ticketId)?.ref ?? detail.ticketId}` : ""}
        description={detail ? `${detail.status.replace(/_/g, " ")} · submitted ${formatDate(detail.submittedAt)}` : ""}
      >
        {detail && (
          <div className="space-y-4 text-[13px] leading-6 text-ink-soft">
            <div className="flex flex-wrap gap-2">
              <Badge tone={REPORT_STATUS_TONES[detail.status] ?? "gray"} dot>
                {detail.status.replace(/_/g, " ")}
              </Badge>
              {detail.customerAcknowledged && <Badge tone="green">Customer acknowledged</Badge>}
              {detail.followUpRequired && <Badge tone="amber">Follow-up required</Badge>}
            </div>

            {detail.reviewRemark && (
              <div className="rounded-lg border border-warning-100 bg-warning-50 p-3 text-warning-700">
                <p className="font-medium">OEM review remark</p>
                <p className="mt-1">{detail.reviewRemark}</p>
                {detail.reviewedBy && (
                  <p className="mt-1 text-[11px]">By {detail.reviewedBy} · {formatDate(detail.reviewedAt)}</p>
                )}
              </div>
            )}

            {(
              [
                ["Inspection findings", detail.inspectionFindings],
                ["Diagnosis", detail.diagnosis],
                ["Work performed", detail.workPerformed],
                ["Parts used", detail.partsUsed],
                ["Error codes", detail.errorCodes],
                ["Recommendations", detail.recommendations],
                ["Safety observations", detail.safetyObservations],
              ] as const
            )
              .filter(([, v]) => v)
              .map(([label, v]) => (
                <section key={label}>
                  <p className="font-medium text-ink">{label}</p>
                  <p className="mt-1">{v}</p>
                </section>
              ))}

            {detail.evidence.length > 0 && (
              <section>
                <p className="font-medium text-ink">Evidence</p>
                <ul className="mt-1 space-y-1">
                  {detail.evidence.map((e) => (
                    <li key={e.id} className="rounded-md bg-surface-alt px-2.5 py-1.5 text-[12px]">
                      {e.name} <span className="text-ink-faint">· {e.sizeKb} KB · {e.uploadedBy}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex justify-end border-t border-line pt-3">
              <Link href={`/oem/tickets/${detail.ticketId}`}>
                <Button variant="outline" size="sm">Open ticket</Button>
              </Link>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
