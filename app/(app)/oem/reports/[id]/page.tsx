"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, ShieldCheck, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { can } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatDateTime } from "@/lib/utils";

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const { state, effectiveRole, reviewReport, toast } = useStore();
  const [remark, setRemark] = useState("");
  const report = state.reports.find((r) => r.id === params.id);
  const ticket = state.tickets.find((t) => t.id === report?.ticketId);
  const engineer = state.engineers.find((e) => e.id === report?.engineerId);
  const canReview = can(effectiveRole, "oem.reports.review") && report?.status !== "approved";

  if (!report) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        title="Report not found"
        description="This report does not exist in the demo dataset."
        action={<Link href="/oem/reports"><Button variant="outline">Back to reports</Button></Link>}
      />
    );
  }

  const decide = (decision: "approved" | "clarification_requested" | "rejected") => {
    if (decision !== "approved" && !remark.trim()) {
      toast("A remark is required", { description: "Explain what the engineer needs to clarify or fix.", tone: "error" });
      return;
    }
    reviewReport(report.id, decision, remark.trim() || "Approved after OEM review.");
    setRemark("");
  };

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{report.id}</span>
            <Badge
              tone={
                report.status === "approved"
                  ? "green"
                  : report.status === "rejected"
                    ? "red"
                    : report.status === "clarification_requested"
                      ? "amber"
                      : "violet"
              }
            >
              {report.status.replace(/_/g, " ")}
            </Badge>
          </span>
        }
        description={`${ticket?.ref ?? report.ticketId} · ${engineer?.name ?? report.engineerId} · submitted ${formatDateTime(report.submittedAt)}`}
        breadcrumbs={<Breadcrumbs />}
        actions={
          <>
            <Link href="/oem/reports"><Button variant="outline"><ArrowLeft className="h-4 w-4" aria-hidden /> Back</Button></Link>
            {ticket && (
              <Link href={`/oem/tickets/${ticket.id}`}>
                <Button>Ticket workspace</Button>
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="Findings & diagnosis" description="What the engineer observed on site" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Fact label="Inspection findings" value={report.inspectionFindings} />
              <Fact label="Diagnosis" value={report.diagnosis} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Work performed" description="Repair, replacement and verification work" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Fact label="Work performed" value={report.workPerformed} />
              <Fact label="Parts used" value={report.partsUsed} />
              <Fact label="Error codes" value={report.errorCodes} />
              <Fact label="Recommendations" value={report.recommendations} />
              <Fact label="Safety observations" value={report.safetyObservations ?? "—"} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Acknowledgement</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tone={report.customerAcknowledged ? "green" : "amber"}>
                    {report.customerAcknowledged ? "Customer acknowledged" : "Customer acknowledgement pending"}
                  </Badge>
                  <Badge tone={report.followUpRequired ? "amber" : "green"}>
                    {report.followUpRequired ? "Follow-up required" : "No follow-up"}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Evidence" description={`${report.evidence.length} uploaded file${report.evidence.length === 1 ? "" : "s"}`} />
            {report.evidence.length === 0 ? (
              <p className="text-[13px] text-ink-muted">No evidence attached.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {report.evidence.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                    <FileText className="h-4 w-4 text-ink-faint" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-ink">{f.name}</p>
                      <p className="text-[10px] text-ink-faint">{f.sizeKb} KB · {formatDateTime(f.uploadedAt)}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => toast("Download simulated", { tone: "info" })}>Open</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="OEM review history" description="Decisions are recorded against this report" />
            {report.reviewedAt ? (
              <div className="space-y-1.5 text-[13px]">
                <p className="text-ink-soft">{report.reviewRemark}</p>
                <p className="text-[11px] text-ink-faint">
                  {report.reviewedBy} · {formatDateTime(report.reviewedAt)} · {report.status.replace(/_/g, " ")}
                </p>
              </div>
            ) : (
              <p className="text-[13px] text-ink-muted">No review decision recorded yet.</p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Review decision" description="OEM-controlled" />
            {!canReview ? (
              <p className="rounded-lg bg-surface-alt px-3 py-3 text-[12px] leading-5 text-ink-muted">
                Your current role can view this report but not approve it. Warranty and repair decisions stay with
                authorised OEM roles.
              </p>
            ) : (
              <div className="space-y-3">
                <Textarea
                  label="Review remark"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Approval note, or the exact clarification required…"
                />
                <Button variant="success" className="w-full" onClick={() => decide("approved")}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> Approve report
                </Button>
                <Button variant="outline" className="w-full" onClick={() => decide("clarification_requested")}>
                  <ShieldCheck className="h-4 w-4" aria-hidden /> Request clarification
                </Button>
                <Button variant="danger" className="w-full" onClick={() => decide("rejected")}>
                  <XCircle className="h-4 w-4" aria-hidden /> Reject report
                </Button>
                <p className="text-[11px] leading-5 text-ink-faint">
                  Approval completes the ticket. Rejection returns it to clarification required — it never closes
                  the ticket automatically.
                </p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Context" />
            <dl className="space-y-2.5 text-[13px]">
              <Row label="Ticket" value={ticket?.ref ?? "—"} />
              <Row label="Customer" value={ticket?.contact.name ?? "—"} />
              <Row label="Site" value={ticket ? `${ticket.location.city}, ${ticket.location.state}` : "—"} />
              <Row label="Engineer" value={engineer?.name ?? report.engineerId} />
              <Row label="Submitted" value={formatDateTime(report.submittedAt)} />
              <Row label="Follow-up" value={report.followUpRequired ? "Required" : "Not required"} />
            </dl>
            {ticket && (
              <Link href={`/oem/tickets/${ticket.id}`} className="mt-3 inline-flex text-[12px] font-medium text-brand-700">
                Open full ticket workspace
              </Link>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-[13px] leading-5 text-ink-soft">{value || "—"}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="text-right text-ink-soft">{value}</dd>
    </div>
  );
}
