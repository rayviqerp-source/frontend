"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleUser,
  Cpu,
  FileText,
  Image as ImageIcon,
  Lock,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  Ticket as TicketIcon,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  TICKET_TRANSITIONS,
  TICKET_STATUS_LABELS,
} from "@/lib/constants";
import { can, canTransition, OEM_CONTROLLED_DECISIONS, rolesForTransition } from "@/lib/permissions";
import { formatDateTime, initials, relativeTime, todayIso } from "@/lib/utils";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/form";
import { recommendEngineers } from "@/lib/selectors";
import { ProgressBar } from "@/components/charts";
import type { TicketStatus } from "@/lib/types";

function SlaCell({
  label,
  dueAt,
  breached,
}: {
  label: string;
  dueAt: string;
  breached: boolean;
}) {
  const remainH = (new Date(dueAt).getTime() - new Date(todayIso()).getTime()) / 3_600_000;
  const overdue = remainH < 0;
  const atRisk = !overdue && remainH <= 12;
  const tone = breached || overdue ? "danger" : atRisk ? "warning" : "success";
  return (
    <div className="rounded-lg border border-line bg-surface-alt/50 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 text-[13px] font-medium text-ink">{formatDateTime(dueAt)}</p>
      <p
        className={`mt-0.5 text-[11px] font-medium ${
          tone === "danger"
            ? "text-danger-600"
            : tone === "warning"
              ? "text-warning-600"
              : "text-success-600"
        }`}
      >
        {breached || overdue
          ? "Breached"
          : atRisk
            ? `At risk · ${Math.round(remainH)}h left`
            : `${Math.round(remainH)}h remaining`}
      </p>
    </div>
  );
}

export function TicketDetail({ ticketId, backHref }: { ticketId: string; backHref: string }) {
  const {
    state,
    effectiveRole,
    transitionTicket,
    addTicketNote,
    assignTicket,
    respondToOffer,
    revokeOffer,
    raiseEscalation,
    closeTicket,
    toast,
  } = useStore();

  const ticket = state.tickets.find((t) => t.id === ticketId);
  const [note, setNote] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [escalateTarget, setEscalateTarget] = useState<"oem" | "rayviq_ops" | "oem_senior">("oem");
  const [transition, setTransition] = useState<{ to: TicketStatus; label: string; needReason: boolean } | null>(null);
  const [reason, setReason] = useState("");

  const recommendations = useMemo(
    () => (ticket ? recommendEngineers(state, ticket, 6) : []),
    [state, ticket],
  );

  if (!ticket) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Ticket not found"
          description="This ticket may have been removed from the demo state, or the ID is invalid."
          action={
            <Link href={backHref}>
              <Button variant="outline">Back to tickets</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const customer = state.customers.find((c) => c.id === ticket.customerId);
  const site = state.sites.find((s) => s.id === ticket.siteId);
  const equipment = state.equipment.find((e) => e.id === ticket.equipmentId);
  const oem = state.oems.find((o) => o.id === ticket.oemId);
  const engineer = state.engineers.find((e) => e.id === ticket.assignedEngineerId);
  const report = state.reports.find((r) => r.id === ticket.reportId);
  const visits = state.visits.filter((v) => v.ticketId === ticket.id);
  const escalations = state.escalations.filter((e) => ticket.escalationIds.includes(e.id));
  const myAssignment = [...state.assignments]
    .reverse()
    .find((a) => a.ticketId === ticket.id && a.state === "pending_offer");
  const latestAssignment = [...state.assignments]
    .filter((a) => a.ticketId === ticket.id)
    .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))[0];

  /* ---- role-based action availability ---- */
  const allowedTransitions = (TICKET_TRANSITIONS[ticket.status] ?? []).filter((to) =>
    canTransition(effectiveRole, ticket.status, to),
  );
  const isEngineerSide = effectiveRole === "engineer" || effectiveRole === "partner_manager";
  const canReview = can(effectiveRole, "oem.reports.review") && (report?.status === "submitted");
  const canAssign =
    can(effectiveRole, "oem.assignment.assign") &&
    ["new", "under_review", "awaiting_assignment", "rejected", "offered"].includes(ticket.status);

  const startTransition = (to: TicketStatus, label: string, needReason = false) => {
    setReason("");
    setTransition({ to, label, needReason });
  };

  const confirmTransition = () => {
    if (!transition) return;
    const ok = transitionTicket(ticket.id, transition.to, reason || undefined);
    if (!ok) toast("Transition blocked", {
      description: "Your role or the ticket state does not allow this move.",
      tone: "error",
    });
    setTransition(null);
    setReason("");
  };

  const transitionLabels: Record<string, string> = {
    under_review: "Move to under review",
    awaiting_assignment: "Send to assignment queue",
    new: "Return to new",
    accepted: "Mark accepted",
    rejected: "Reject offer",
    contact_pending: "Start customer contact",
    visit_scheduled: "Schedule visit",
    in_progress: "Start visit on site",
    report_submitted: "Mark report submitted",
    awaiting_oem_review: "Submit for OEM review",
    clarification_required: "Request clarification",
    escalated: "Escalate ticket",
    completed: "Approve & complete",
    closed: "Close ticket",
    offered: "Re-offer ticket",
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-5">
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <TicketIcon className="h-4.5 w-4.5" />
              </span>
              <h1 className="font-mono text-xl font-semibold tracking-tight text-ink">{ticket.ref}</h1>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.source && <Badge tone="gray">via {ticket.source}</Badge>}
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              {ticket.issue.category} · {oem?.name ?? "OEM"} · created {formatDateTime(ticket.createdAt)}{" "}
              ({relativeTime(ticket.createdAt)})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canAssign && (
              <Button onClick={() => setAssignOpen(true)}>
                <Wrench className="h-4 w-4" /> {engineer ? "Reassign" : "Assign engineer"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setEscalateOpen(true)}
              disabled={ticket.status === "closed" || ticket.status === "completed"}
            >
              <AlertOctagon className="h-4 w-4" /> Escalate
            </Button>
          </div>
        </div>
      </div>

      {/* Engineer offer response banner */}
      {isEngineerSide && myAssignment && (
        <Card className="mb-4 border-brand-200 bg-brand-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-brand-800">
                <Sparkles className="h-4 w-4" /> New assignment offer
              </p>
              <p className="mt-1 text-[13px] text-brand-700">
                Respond before{" "}
                <strong>{formatDateTime(myAssignment.responseDeadline)}</strong> — no response marks
                it &quot;no response&quot; and returns the ticket to the queue.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => respondToOffer(ticket.id, true)}
                disabled={!can(effectiveRole, "eng.requests.respond")}
              >
                <CheckCircle2 className="h-4 w-4" /> Accept
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  respondToOffer(
                    ticket.id,
                    false,
                    "Not available in my area this week",
                  )
                }
                disabled={!can(effectiveRole, "eng.requests.respond")}
              >
                Decline
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* SLA strip */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <SlaCell label="Response due" dueAt={ticket.sla.responseDueAt} breached={ticket.sla.breached} />
        <SlaCell label="Assignment due" dueAt={ticket.sla.assignmentDueAt} breached={ticket.sla.breached} />
        <SlaCell label="Visit target" dueAt={ticket.sla.visitDueAt} breached={ticket.sla.breached} />
        <SlaCell label="Resolution due" dueAt={ticket.sla.resolutionDueAt} breached={ticket.sla.breached} />
      </div>

      {/* Status actions */}
      {(allowedTransitions.length > 0 || (isEngineerSide && myAssignment) || canReview) && (
        <Card className="mb-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-ink">Available actions for you</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                Actions follow the transition matrix for {effectiveRole.replace(/_/g, " ")}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canReview && report && (
                <>
                  <Button
                    variant="success"
                    onClick={() =>
                      startTransition("completed", "Approve & complete", true)
                    }
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => startTransition("clarification_required", "Request clarification", true)}
                  >
                    <MessageSquare className="h-4 w-4" /> Clarify
                  </Button>
                </>
              )}
              {allowedTransitions.map((to) => (
                <Button
                  key={to}
                  variant={
                    to === "closed"
                      ? "secondary"
                      : to === "escalated"
                        ? "danger"
                        : to === "completed"
                          ? "success"
                          : "outline"
                  }
                  onClick={() =>
                    startTransition(
                      to,
                      transitionLabels[to] ?? `Move to ${TICKET_STATUS_LABELS[to]}`,
                      ["closed", "escalated", "clarification_required", "rejected"].includes(to),
                    )
                  }
                >
                  {transitionLabels[to] ?? TICKET_STATUS_LABELS[to]}
                </Button>
              ))}
              {ticket.status === "completed" && can(effectiveRole, "oem.tickets.transition") && (
                <Button
                  variant="secondary"
                  onClick={() => closeTicket(ticket.id)}
                  title="Closure rule: report approved + review complete"
                >
                  <Lock className="h-4 w-4" /> Close ticket
                </Button>
              )}
            </div>
          </div>
          {allowedTransitions.length === 0 && !canReview && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint">
              <Lock className="h-3.5 w-3.5" /> No transitions are permitted for your role at this
              stage — this state is owned by another role.
            </p>
          )}
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* LEFT column */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Issue" action={<Badge tone="gray">{ticket.issue.categoryGroup}</Badge>} />
            <p className="text-sm leading-6 text-ink-soft">{ticket.issue.description}</p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-lg bg-surface-alt/60 px-3.5 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-ink-faint">Category</p>
                <p className="mt-0.5 text-[13px] font-medium text-ink">{ticket.issue.category}</p>
              </div>
              <div className="rounded-lg bg-surface-alt/60 px-3.5 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-ink-faint">Error code</p>
                <p className="mt-0.5 font-mono text-[13px] font-medium text-ink">
                  {ticket.issue.errorCode ?? "—"}
                </p>
              </div>
            </div>
            {ticket.attachments.length > 0 && (
              <div className="mt-3.5 border-t border-line pt-3.5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  Attachments
                </p>
                <div className="flex flex-wrap gap-2">
                  {ticket.attachments.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-alt/60 px-2.5 py-1.5 text-xs text-ink-soft"
                    >
                      {a.kind === "image" ? (
                        <ImageIcon className="h-3.5 w-3.5 text-ink-faint" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-ink-faint" />
                      )}
                      {a.name}
                      <span className="text-ink-faint">{a.sizeKb} KB</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Product & site */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader title="Product" />
              <div className="space-y-2.5 text-[13px]">
                <div className="flex items-start gap-2">
                  <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
                  <div>
                    <p className="font-medium text-ink">{ticket.product.model || "—"}</p>
                    <p className="font-mono text-xs text-ink-muted">SN: {ticket.product.serialNumber || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Category</span>
                  <span className="font-medium capitalize text-ink">
                    {ticket.product.category.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Warranty</span>
                  <Badge tone={ticket.product.warrantyStatus === "out_of_warranty" ? "gray" : "green"}>
                    {ticket.product.warrantyStatus.replace(/_/g, " ")}
                  </Badge>
                </div>
                {ticket.product.installationDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Installed</span>
                    <span className="text-ink">{new Date(ticket.product.installationDate).toLocaleDateString("en-IN")}</span>
                  </div>
                )}
                {equipment && (
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Firmware</span>
                    <span className="font-mono text-ink">{equipment.firmware ?? "—"}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 rounded-lg border border-warning-100 bg-warning-50 px-3 py-2.5 text-[12px] leading-5 text-warning-700">
                Warranty/repair/replacement decisions stay with <strong>{oem?.shortName ?? "the OEM"}</strong>.
              </div>
            </Card>

            <Card>
              <CardHeader title="Site & contact" />
              <div className="space-y-2.5 text-[13px]">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
                  <div>
                    <p className="font-medium text-ink">{site?.name ?? "Site"}</p>
                    <p className="text-xs text-ink-muted">{ticket.location.address}</p>
                    <p className="text-xs text-ink-muted">
                      {ticket.location.city}, {ticket.location.state} — {ticket.location.pincode}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CircleUser className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
                  <div>
                    <p className="font-medium text-ink">{ticket.contact.name}</p>
                    <p className="flex items-center gap-1 text-xs text-ink-muted">
                      <Phone className="h-3 w-3" /> {ticket.contact.phone}
                    </p>
                    <p className="text-xs text-ink-muted">Available: {ticket.contact.availability}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-line pt-2.5">
                  <span className="text-ink-muted">Customer</span>
                  <span className="font-medium text-ink">{customer?.name ?? "—"}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Report */}
          {report && (
            <Card>
              <CardHeader
                title="Service report"
                action={
                  <Badge
                    tone={
                      report.status === "approved"
                        ? "green"
                        : report.status === "rejected"
                          ? "red"
                          : report.status === "clarification_requested"
                            ? "amber"
                            : "blue"
                    }
                    dot
                  >
                    {report.status.replace(/_/g, " ")}
                  </Badge>
                }
              />
              <div className="space-y-3 text-[13px]">
                {[
                  ["Inspection findings", report.inspectionFindings],
                  ["Diagnosis", report.diagnosis],
                  ["Work performed", report.workPerformed],
                  ["Parts used", report.partsUsed],
                  ["Recommendations", report.recommendations],
                  ["Safety observations", report.safetyObservations],
                ].map(([label, value]) =>
                  value ? (
                    <div key={label}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
                      <p className="mt-0.5 leading-6 text-ink-soft">{value}</p>
                    </div>
                  ) : null,
                )}
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div className="rounded-lg bg-surface-alt/60 px-3 py-2">
                    <p className="text-[11px] text-ink-faint">Error codes</p>
                    <p className="font-mono text-[13px] text-ink">{report.errorCodes || "—"}</p>
                  </div>
                  <div className="rounded-lg bg-surface-alt/60 px-3 py-2">
                    <p className="text-[11px] text-ink-faint">Customer sign-off</p>
                    <p className="text-[13px] font-medium text-ink">
                      {report.customerAcknowledged ? "Acknowledged" : "Pending"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-alt/60 px-3 py-2">
                    <p className="text-[11px] text-ink-faint">Follow-up</p>
                    <p className="text-[13px] font-medium text-ink">
                      {report.followUpRequired ? "Required" : "Not required"}
                    </p>
                  </div>
                </div>
                {report.evidence.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                      Evidence ({report.evidence.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {report.evidence.map((ev) => (
                        <span
                          key={ev.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-alt/60 px-2.5 py-1.5 text-xs text-ink-soft"
                        >
                          <ImageIcon className="h-3.5 w-3.5 text-ink-faint" /> {ev.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {report.reviewRemark && (
                  <div className="rounded-lg border border-line bg-surface-alt/60 px-3.5 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                      Review remark · {report.reviewedBy}
                    </p>
                    <p className="mt-1 leading-6 text-ink-soft">{report.reviewRemark}</p>
                    {report.reviewedAt && (
                      <p className="mt-1 text-[11px] text-ink-faint">{formatDateTime(report.reviewedAt)}</p>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                  <Link href={`/engineer/reports?ticket=${ticket.id}`}>
                    <Button variant="outline" size="sm">
                      <FileText className="h-3.5 w-3.5" /> Open in report workspace
                    </Button>
                  </Link>
                  {report.status === "clarification_requested" && isEngineerSide && (
                    <Link href={`/engineer/reports?ticket=${ticket.id}`}>
                    <Button size="sm">
                      <Send className="h-3.5 w-3.5" /> Submit clarification
                    </Button>
                  </Link>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader
              title="Timeline"
              description={`${ticket.timeline.length} events · every action is append-only`}
            />
            <ol className="relative space-y-4 border-l border-line pl-5">
              {[...ticket.timeline].reverse().map((e) => (
                <li key={e.id} className="relative">
                  <span
                    className={`absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-surface ${
                      e.type === "escalation"
                        ? "bg-danger-500"
                        : e.type === "closure" || e.type === "review"
                          ? "bg-success-500"
                          : e.type === "assignment" || e.type === "offer"
                            ? "bg-accent-500"
                            : "bg-brand-500"
                    }`}
                  />
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="text-[13px] font-medium text-ink">{e.title}</p>
                    {(e.fromStatus || e.toStatus) && (
                      <span className="font-mono text-[11px] text-ink-faint">
                        {e.fromStatus ?? "—"} → {e.toStatus ?? "·"}
                      </span>
                    )}
                  </div>
                  {e.detail && <p className="mt-0.5 text-xs leading-5 text-ink-muted">{e.detail}</p>}
                  <p className="mt-1 text-[11px] text-ink-faint">
                    {e.actor} · {e.actorRole.replace(/_/g, " ")} · {formatDateTime(e.at)}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* RIGHT column */}
        <div className="space-y-4">
          {/* Assignment */}
          <Card>
            <CardHeader title="Assignment" />
            {engineer ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                    {initials(engineer.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{engineer.name}</p>
                    <p className="text-xs text-ink-muted">
                      {engineer.city} · ★ {engineer.rating.toFixed(1)} · load {engineer.currentLoad}/
                      {engineer.maxLoad}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="blue">{engineer.verification.replace(/_/g, " ")}</Badge>
                  <Badge tone={engineer.availability === "available" ? "green" : "amber"}>
                    {engineer.availability}
                  </Badge>
                </div>
                <div className="text-xs text-ink-muted">
                  <p>
                    Offer state:{" "}
                    <strong className="text-ink-soft">
                      {latestAssignment?.state.replace(/_/g, " ") ?? "—"}
                    </strong>
                  </p>
                  <p>
                    Assigned by {latestAssignment?.assignedBy ?? "—"} ·{" "}
                    {latestAssignment ? relativeTime(latestAssignment.assignedAt) : ""}
                  </p>
                </div>
                {can(effectiveRole, "oem.assignment.assign") && myAssignment && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => revokeOffer(myAssignment.id)}
                  >
                    Revoke offer
                  </Button>
                )}
                <Link href="/oem/engineers">
                  <Button variant="ghost" size="sm" className="w-full">
                    View engineer profile
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <EmptyState
                  icon={<Wrench className="h-5 w-5" />}
                  title="Unassigned"
                  description="Send this ticket to the assignment queue to get scored recommendations."
                  className="py-8"
                  action={
                    canAssign ? (
                      <Button size="sm" onClick={() => setAssignOpen(true)}>
                        Find engineers
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            )}
          </Card>

          {/* Visits */}
          <Card>
            <CardHeader title="Visits" action={<Badge tone="gray">{visits.length}</Badge>} />
            {visits.length === 0 ? (
              <p className="text-[13px] text-ink-muted">
                No visits scheduled. Engineers schedule visits after accepting the offer.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {visits.map((v) => {
                  const eng = state.engineers.find((e) => e.id === v.engineerId);
                  return (
                    <li key={v.id} className="rounded-lg border border-line bg-surface-alt/50 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-medium text-ink">{formatDateTime(v.scheduledFor)}</p>
                        <Badge
                          tone={
                            v.status === "completed"
                              ? "green"
                              : v.status === "failed" || v.status === "cancelled"
                                ? "red"
                                : v.status === "in_progress"
                                  ? "cyan"
                                  : "blue"
                          }
                        >
                          {v.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {v.slot} · {eng?.name ?? "engineer"}
                      </p>
                      {v.reason && <p className="mt-1 text-xs text-danger-600">{v.reason}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
            <Link href="/engineer/visits">
              <Button variant="ghost" size="sm" className="mt-2 w-full">
                <CalendarClock className="h-3.5 w-3.5" /> Open visit planner
              </Button>
            </Link>
          </Card>

          {/* Escalations */}
          {escalations.length > 0 && (
            <Card className="border-danger-100">
              <CardHeader title="Escalations" />
              <ul className="space-y-2.5">
                {escalations.map((esc) => (
                  <li key={esc.id} className="rounded-lg border border-danger-100 bg-danger-50/60 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-danger-700">Level {esc.level}</p>
                      <Badge tone={esc.status === "resolved" ? "green" : "red"}>{esc.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-danger-600/90">{esc.reason}</p>
                    <p className="mt-1 text-[11px] text-ink-faint">
                      {esc.raisedBy} · {formatDateTime(esc.raisedAt)} · target {esc.target.replace(/_/g, " ")}
                    </p>
                    {esc.resolution && (
                      <p className="mt-1 text-xs text-success-700">✓ {esc.resolution}</p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Internal notes */}
          <Card>
            <CardHeader
              title="Internal notes"
              description="Visible to OEM/platform staff only — never shown to the customer."
            />
            <div className="space-y-2.5">
              {ticket.notes.map((n) => (
                <div key={n.id} className="rounded-lg bg-surface-alt/60 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium text-ink">{n.author}</p>
                    <Badge tone={n.visibility === "platform_internal" ? "violet" : "gray"}>
                      {n.visibility.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-ink-soft">{n.body}</p>
                  <p className="mt-1 text-[11px] text-ink-faint">{formatDateTime(n.at)}</p>
                </div>
              ))}
              {ticket.notes.length === 0 && (
                <p className="text-[13px] text-ink-muted">No notes yet.</p>
              )}
              <div className="border-t border-line pt-3">
                <Textarea
                  label="Add a note"
                  placeholder="Context for your team…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button
                  size="sm"
                  className="mt-2"
                  disabled={!note.trim()}
                  onClick={() => {
                    addTicketNote(
                      ticket.id,
                      note.trim(),
                      effectiveRole.startsWith("super") || effectiveRole === "ops_manager" || effectiveRole === "support_executive"
                        ? "platform_internal"
                        : "oem_internal",
                    );
                    setNote("");
                    toast("Note added");
                  }}
                >
                  <Send className="h-3.5 w-3.5" /> Add note
                </Button>
              </div>
            </div>
          </Card>

          {/* Decision boundary */}
          <Card className="border-accent-300/60 bg-accent-100/30">
            <p className="text-[13px] font-semibold text-accent-600">OEM-controlled decisions</p>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-5 text-ink-muted">
              {OEM_CONTROLLED_DECISIONS.map((d) => (
                <li key={d} className="flex items-center gap-2">
                  <Lock className="h-3 w-3 shrink-0 text-accent-600" /> {d}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-4 text-ink-faint">
              RAYVIQ tracks evidence and approvals; it never auto-decides these outcomes.
            </p>
          </Card>
        </div>
      </div>

      {/* Assign modal */}
      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign an engineer"
        description="Scored by location, expertise, availability, workload and service radius — reasons shown per candidate."
        size="lg"
      >
        <div className="space-y-3">
          {recommendations.map((r) => {
            const busy = r.engineer.availability !== "available";
            return (
              <div
                key={r.engineer.id}
                className={`rounded-xl border p-4 ${
                  r.concerns.length > 1 ? "border-warning-100 bg-warning-50/40" : "border-line bg-surface"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                      {initials(r.engineer.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{r.engineer.name}</p>
                      <p className="text-xs text-ink-muted">
                        {r.engineer.city}, {r.engineer.state} · {r.engineer.experienceYears}y exp ·
                        load {r.engineer.currentLoad}/{r.engineer.maxLoad}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-ink">{r.score}</p>
                    <p className="text-[11px] text-ink-faint">match score</p>
                  </div>
                </div>
                <ProgressBar value={r.score} tone={r.score >= 70 ? "success" : r.score >= 45 ? "warning" : "danger"} className="mt-2.5" />
                <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                  <ul className="space-y-1">
                    {r.reasons.map((x) => (
                      <li key={x} className="flex items-start gap-1.5 text-xs text-success-700">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> {x}
                      </li>
                    ))}
                  </ul>
                  <ul className="space-y-1">
                    {r.concerns.map((x) => (
                      <li key={x} className="flex items-start gap-1.5 text-xs text-warning-700">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {x}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAssignOpen(false);
                      toast("Filters are available in Assignment Operations", { tone: "info" });
                    }}
                  >
                    Filter list
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy}
                    title={busy ? "Engineer is busy/offline" : undefined}
                    onClick={() => {
                      assignTicket(ticket.id, r.engineer.id);
                      setAssignOpen(false);
                    }}
                  >
                    Offer this ticket
                  </Button>
                </div>
              </div>
            );
          })}
          {recommendations.length === 0 && (
            <EmptyState
              icon={<Wrench className="h-5 w-5" />}
              title="No eligible engineers"
              description="All engineers are unverified, suspended or exclusive to another OEM. Adjust filters or verify engineers in the admin portal."
            />
          )}
        </div>
      </Modal>

      {/* Escalate modal */}
      <Modal
        open={escalateOpen}
        onClose={() => setEscalateOpen(false)}
        title="Raise an escalation"
        description="Escalations notify the target roles and mark the ticket as escalated."
        footer={
          <>
            <Button variant="outline" onClick={() => setEscalateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!escalateReason.trim()}
              onClick={() => {
                raiseEscalation(ticket.id, escalateReason.trim(), escalateTarget);
                setEscalateOpen(false);
                setEscalateReason("");
              }}
            >
              <AlertOctagon className="h-4 w-4" /> Raise escalation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="esc-target" className="mb-1.5 block text-[13px] font-medium text-ink">
              Escalate to
            </label>
            <select
              id="esc-target"
              value={escalateTarget}
              onChange={(e) => setEscalateTarget(e.target.value as typeof escalateTarget)}
              className="h-9.5 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="oem">OEM service desk (L1)</option>
              <option value="oem_senior">OEM senior management (L2)</option>
              <option value="rayviq_ops">RAYVIQ operations (L3)</option>
            </select>
          </div>
          <Textarea
            label="Reason"
            required
            placeholder="What is going wrong and what outcome do you need?"
            value={escalateReason}
            onChange={(e) => setEscalateReason(e.target.value)}
          />
        </div>
      </Modal>

      {/* Transition confirm */}
      <ConfirmDialog
        open={transition !== null}
        onClose={() => setTransition(null)}
        onConfirm={confirmTransition}
        title={transition?.label ?? "Confirm"}
        confirmLabel={transition?.label ?? "Confirm"}
        tone={transition?.to === "escalated" ? "danger" : transition?.to === "completed" ? "success" : "primary"}
        requireReason={transition?.needReason}
        reasonLabel="Reason / note"
        reasonPlaceholder="Optional context recorded on the timeline…"
        reasonRequired={["escalated", "clarification_required", "rejected", "closed"].includes(transition?.to ?? "")}
        message={
          <div className="space-y-2">
            <p>
              Move <strong className="font-mono">{ticket.ref}</strong> from{" "}
              <strong>{TICKET_STATUS_LABELS[ticket.status]}</strong> to{" "}
              <strong>{transition ? TICKET_STATUS_LABELS[transition.to] : ""}</strong>?
            </p>
            <p className="text-xs text-ink-faint">
              Permitted roles for this transition:{" "}
              {transition
                ? rolesForTransition(ticket.status, transition.to)
                    .filter((r) => r !== "system")
                    .map((r) => r.replace(/_/g, " "))
                    .join(", ")
                : ""}
            </p>
          </div>
        }
      />
    </div>
  );
}
