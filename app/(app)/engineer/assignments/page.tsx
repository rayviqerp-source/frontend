"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ClipboardList,
  ListChecks,
  MessageSquareText,
  Play,
  Send,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useEngineerScope } from "@/components/engineer/scope";
import { ReportModal } from "@/components/engineer/report-modal";
import { OPEN_STATUSES, PRIORITY_LABELS, PRODUCT_CATEGORY_LABELS, TICKET_STATUS_LABELS } from "@/lib/constants";
import { PriorityBadge, StatusBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, StatCard } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Drawer, Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/states";
import { Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatDate, formatDateTime, isOverdue } from "@/lib/utils";
import type { Ticket } from "@/lib/types";

/** Statuses an engineer still works on personally. */
const MY_ACTIVE_STATUSES = [
  "accepted",
  "contact_pending",
  "visit_scheduled",
  "in_progress",
  "report_submitted",
  "awaiting_oem_review",
  "clarification_required",
] as const;

function nextStepFor(t: Ticket, hasPendingVisit: boolean): string {
  switch (t.status) {
    case "accepted":
      return "Contact the customer, then schedule the visit";
    case "contact_pending":
      return "Schedule a visit with the agreed slot";
    case "visit_scheduled":
      return hasPendingVisit ? "Visit planned, start it on arrival" : "Schedule the visit";
    case "in_progress":
      return "Complete inspection & submit the service report";
    case "report_submitted":
    case "awaiting_oem_review":
      return "Report with OEM review";
    case "clarification_required":
      return "Address the OEM remark and re-submit the report";
    default:
      return "—";
  }
}

export default function EngineerAssignmentsPage() {
  const {
    state,
    markCustomerContacted,
    scheduleVisit,
    startVisit,
    submitReport,
  } = useStore();
  const scope = useEngineerScope();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [contactModal, setContactModal] = useState<Ticket | null>(null);
  const [visitModal, setVisitModal] = useState<Ticket | null>(null);
  const [reportModal, setReportModal] = useState<Ticket | null>(null);

  const scheduleIds = useMemo(() => scope?.scopeEngineers.map((e) => e.id) ?? [], [scope]);

  const active = useMemo(
    () =>
      state.tickets.filter(
        (t) =>
          t.assignedEngineerId != null &&
          scheduleIds.includes(t.assignedEngineerId) &&
          MY_ACTIVE_STATUSES.includes(t.status as (typeof MY_ACTIVE_STATUSES)[number]) &&
          OPEN_STATUSES.includes(t.status),
      ),
    [state, scheduleIds],
  );

  const awaitingContact = active.filter((t) => t.status === "accepted" || t.status === "contact_pending").length;
  const scheduled = active.filter((t) => t.status === "visit_scheduled").length;
  const inField = active.filter((t) => t.status === "in_progress").length;
  const awaitingReview = active.filter(
    (t) => t.status === "report_submitted" || t.status === "awaiting_oem_review" || t.status === "clarification_required",
  ).length;

  const detail = detailId ? state.tickets.find((t) => t.id === detailId) ?? null : null;
  const pendingVisitOf = (ticketId: string) =>
    state.visits.find((v) => v.ticketId === ticketId && (v.status === "scheduled" || v.status === "rescheduled"));

  if (!scope || scope.scopeEngineers.length === 0) {
    return (
      <div>
        <PageHeader
          title="My assignments"
          description="Everything currently assigned to you, from acceptance through the technical service report."
          breadcrumbs={<Breadcrumbs />}
        />
        <Card>
          <EmptyState
            icon={<ListChecks className="h-5 w-5" />}
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
        title="My assignments"
        description="Everything currently assigned to you, from acceptance through the technical service report."
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
        <StatCard label="Active jobs" value={active.length} tone="brand" icon={<ListChecks className="h-4 w-4" aria-hidden />} />
        <StatCard label="Awaiting contact / visit planning" value={awaitingContact} tone={awaitingContact ? "warning" : "default"} icon={<MessageSquareText className="h-4 w-4" aria-hidden />} />
        <StatCard label="Scheduled / in field" value={scheduled + inField} tone="default" icon={<CalendarClock className="h-4 w-4" aria-hidden />} />
        <StatCard label="Reports pending review" value={awaitingReview} tone={awaitingReview ? "brand" : "default"} icon={<ClipboardList className="h-4 w-4" aria-hidden />} />
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {active.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<ListChecks className="h-5 w-5" />}
              title="No active assignments"
              description="Accept a request from the Available Requests page and it will appear here with its full workflow."
              action={
                <Link href="/engineer/requests">
                  <Button variant="outline">View available requests</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <Table>
            <THead
              columns={[
                { label: "Reference" },
                { label: "Customer" },
                { label: "Issue" },
                { label: "Priority" },
                { label: "Status" },
                { label: "Next step" },
                { label: "Due" },
              ]}
            />
            <TBody>
              {active.map((t) => {
                const late = isOverdue(t.dueAt);
                const eng = state.engineers.find((e) => e.id === t.assignedEngineerId);
                return (
                  <Tr key={t.id} onClick={() => setDetailId(t.id)}>
                    <Td>
                      <span className="font-mono text-[12px] font-medium text-ink">{t.ref}</span>
                      {eng && (
                        <span className="mt-0.5 block text-[11px] text-ink-faint">{eng.name}</span>
                      )}
                    </Td>
                    <Td>
                      <p className="text-[13px] font-medium text-ink">{t.contact.name}</p>
                      <p className="text-[11px] text-ink-faint">
                        {t.location.city}, {t.location.state}
                      </p>
                    </Td>
                    <Td className="max-w-56">
                      <p className="truncate text-[13px] text-ink-soft">{t.issue.category}</p>
                      <p className="truncate text-[11px] text-ink-faint">{t.product.model}</p>
                    </Td>
                    <Td><PriorityBadge priority={t.priority} /></Td>
                    <Td><StatusBadge status={t.status} /></Td>
                    <Td>
                      <span className="text-[12px] text-ink-soft">
                        {nextStepFor(t, pendingVisitOf(t.id) != null)}
                      </span>
                    </Td>
                    <Td>
                      <span className={`text-[12px] ${late ? "font-medium text-danger-600" : "text-ink-soft"}`}>
                        {formatDate(t.dueAt)}
                      </span>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </div>

      {/* Assignment detail drawer */}
      <Drawer
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail ? `${detail.ref} — ${TICKET_STATUS_LABELS[detail.status]}` : ""}
        description={detail?.issue.category}
      >
        {detail && (
          <div className="space-y-5 text-[13px] leading-6 text-ink-soft">
            <div className="flex flex-wrap gap-2">
              <PriorityBadge priority={detail.priority} />
              <StatusBadge status={detail.status} />
              <Badge tone="gray">{PRIORITY_LABELS[detail.priority]} SLA · due {formatDate(detail.dueAt)}</Badge>
            </div>

            <section>
              <p className="font-medium text-ink">Reported issue</p>
              <p className="mt-1">{detail.issue.description}</p>
              <p className="mt-1 text-[12px] text-ink-muted">
                {PRODUCT_CATEGORY_LABELS[detail.product.category] ?? detail.product.category} ·{" "}
                {detail.product.model} · SN {detail.product.serialNumber} ·{" "}
                {detail.product.warrantyStatus.replace(/_/g, " ")}
              </p>
            </section>

            <section>
              <p className="font-medium text-ink">Customer & site</p>
              <p className="mt-1">
                {detail.contact.name} · {detail.contact.phone}
                <br />
                {detail.location.address}, {detail.location.city}
                <br />
                Availability: {detail.contact.availability}
              </p>
            </section>

            {pendingVisitOf(detail.id) && (
              <section className="rounded-lg border border-line bg-surface-alt p-3">
                <p className="font-medium text-ink">Upcoming visit</p>
                <p className="mt-1">
                  {formatDateTime(pendingVisitOf(detail.id)!.scheduledFor)} ·{" "}
                  {pendingVisitOf(detail.id)!.slot}
                  {pendingVisitOf(detail.id)!.notes ? ` — ${pendingVisitOf(detail.id)!.notes}` : ""}
                </p>
              </section>
            )}

            {detail.status === "clarification_required" && (
              <section className="rounded-lg border border-warning-100 bg-warning-50 p-3 text-warning-700">
                <p className="font-medium">OEM clarification requested</p>
                <p className="mt-1 text-[12px]">
                  {state.reports.find((r) => r.id === detail.reportId)?.reviewRemark ??
                    "See the OEM remark on the ticket."}
                </p>
              </section>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-3">
              {(detail.status === "accepted" || detail.status === "contact_pending") && (
                <Button variant="outline" size="sm" onClick={() => setContactModal(detail)}>
                  <MessageSquareText className="h-3.5 w-3.5" aria-hidden /> Mark customer contacted
                </Button>
              )}
              {(detail.status === "accepted" || detail.status === "contact_pending") && (
                <Button size="sm" onClick={() => setVisitModal(detail)}>
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Schedule visit
                </Button>
              )}
              {detail.status === "visit_scheduled" && pendingVisitOf(detail.id) && (
                <Button size="sm" onClick={() => startVisit(pendingVisitOf(detail.id)!.id)}>
                  <Play className="h-3.5 w-3.5" aria-hidden /> Start visit
                </Button>
              )}
              {detail.status === "in_progress" && (
                <Button size="sm" onClick={() => setReportModal(detail)}>
                  <Send className="h-3.5 w-3.5" aria-hidden /> Submit service report
                </Button>
              )}
              {detail.status === "clarification_required" && (
                <Button size="sm" onClick={() => setReportModal(detail)}>
                  <Send className="h-3.5 w-3.5" aria-hidden /> Re-submit report
                </Button>
              )}
              {(detail.status === "report_submitted" || detail.status === "awaiting_oem_review") && (
                <Link href="/engineer/reports">
                  <Button variant="outline" size="sm">View report status</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Contact modal */}
      {contactModal && (
        <ContactModal
          ticket={contactModal}
          onClose={() => setContactModal(null)}
          onSubmit={(note) => {
            markCustomerContacted(contactModal.id, note || undefined);
            setContactModal(null);
          }}
        />
      )}

      {/* Schedule visit modal */}
      {visitModal && (
        <VisitModal
          ticket={visitModal}
          demoEngineerName={state.engineers.find((e) => e.id === visitModal.assignedEngineerId)?.name ?? "you"}
          onClose={() => setVisitModal(null)}
          onSubmit={(scheduledFor, slot, notes) => {
            scheduleVisit(visitModal.id, visitModal.assignedEngineerId!, scheduledFor, slot, notes);
            setVisitModal(null);
          }}
        />
      )}

      {/* Report modal */}
      {reportModal && (
        <ReportModal
          ticket={reportModal}
          reviewRemark={
            state.reports.find((r) => r.id === reportModal.reportId)?.reviewRemark ?? undefined
          }
          onClose={() => setReportModal(null)}
          onSubmit={(body) => {
            submitReport(reportModal.id, body);
            setReportModal(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- sub-modals ---------------- */

function ContactModal({
  ticket,
  onClose,
  onSubmit,
}: {
  ticket: Ticket;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title="Record customer contact"
      description={`${ticket.ref} · ${ticket.contact.name} · ${ticket.contact.phone}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(note.trim())}>
            Save contact record
          </Button>
        </>
      }
    >
      <Textarea
        label="Contact note"
        hint="Optional"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Called and agreed Saturday 10:00 visit; caretaker will keep the inverter room open."
      />
    </Modal>
  );
}

function VisitModal({
  ticket,
  demoEngineerName,
  onClose,
  onSubmit,
}: {
  ticket: Ticket;
  demoEngineerName: string;
  onClose: () => void;
  onSubmit: (scheduledFor: string, slot: string, notes?: string) => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [slot, setSlot] = useState("10:00 – 12:00");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!date || !time) {
      setError("Pick a date and start time for the visit.");
      return;
    }
    const iso = new Date(`${date}T${time}:00`).toISOString();
    if (Number.isNaN(new Date(iso).getTime())) {
      setError("Invalid date/time.");
      return;
    }
    onSubmit(iso, slot || time, notes.trim() || undefined);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Schedule site visit"
      description={`${ticket.ref} · engineer: ${demoEngineerName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Confirm visit</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Visit date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Start time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
        <Select
          label="Slot label"
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          options={[
            { value: "08:00 – 10:00", label: "08:00 – 10:00" },
            { value: "09:00 – 11:00", label: "09:00 – 11:00" },
            { value: "10:00 – 12:00", label: "10:00 – 12:00" },
            { value: "14:00 – 16:00", label: "14:00 – 16:00" },
            { value: "15:00 – 17:00", label: "15:00 – 17:00" },
            ...(slot && !["08:00 – 10:00", "09:00 – 11:00", "10:00 – 12:00", "14:00 – 16:00", "15:00 – 17:00"].includes(slot)
              ? [{ value: slot, label: `${slot} (custom)` }]
              : []),
          ]}
        />
        <Textarea
          label="Planning notes"
          hint="Optional — shared with the OEM"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Carry torque kit; site access via security gate B."
        />
        {error && <p className="text-xs text-danger-600">{error}</p>}
      </div>
    </Modal>
  );
}
