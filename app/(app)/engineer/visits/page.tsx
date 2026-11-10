"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Play,
  RotateCw,
  XCircle,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useEngineerScope } from "@/components/engineer/scope";
import { VISIT_STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, StatCard } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Drawer } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/states";
import { Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatDate, formatDateTime, isOverdue, todayIso } from "@/lib/utils";
import type { Visit, VisitOutcome } from "@/lib/types";

type VisitModal =
  | { kind: "reschedule"; visit: Visit }
  | { kind: "close"; visit: Visit };

export default function EngineerVisitsPage() {
  const { state, startVisit, scheduleVisit, updateVisit } = useStore();
  const scope = useEngineerScope();

  const [tab, setTab] = useState<"upcoming" | "active" | "past">("upcoming");
  const [actionModal, setActionModal] = useState<VisitModal | null>(null);
  const [cancelVisit, setCancelVisit] = useState<{ visit: Visit; status: VisitOutcome } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const scheduleIds = useMemo(() => scope?.scopeEngineers.map((e) => e.id) ?? [], [scope]);

  const myVisits = useMemo(
    () =>
      state.visits
        .filter((v) => scheduleIds.includes(v.engineerId))
        .sort((a, b) => (a.scheduledFor < b.scheduledFor ? 1 : -1)),
    [state, scheduleIds],
  );

  const now = new Date(todayIso()).getTime();
  const upcoming = myVisits.filter(
    (v) => (v.status === "scheduled" || v.status === "rescheduled") && new Date(v.scheduledFor).getTime() >= now,
  );
  const active = myVisits.filter((v) => v.status === "in_progress");
  const past = myVisits.filter(
    (v) =>
      v.status !== "scheduled" &&
      v.status !== "rescheduled" &&
      v.status !== "in_progress" &&
      ((v.status === "completed" || v.status === "cancelled" || v.status === "failed" || v.status === "customer_unavailable") ||
        (v.status === "scheduled" && new Date(v.scheduledFor).getTime() < now)),
  );
  const overdueUpcoming = upcoming.filter((v) => isOverdue(v.scheduledFor)).length;

  const tabRows = tab === "upcoming" ? upcoming : tab === "active" ? active : past;

  const detail = detailId ? myVisits.find((v) => v.id === detailId) ?? null : null;
  const ticketOf = (ticketId: string) => state.tickets.find((t) => t.id === ticketId);
  const engineName = (id: string) => state.engineers.find((e) => e.id === id)?.name ?? "Engineer";

  if (!scope || scope.scopeEngineers.length === 0) {
    return (
      <div>
        <PageHeader
          title="Visits"
          description="Plan, start and close site visits; every outcome feeds the ticket timeline and the OEM dashboard."
          breadcrumbs={<Breadcrumbs />}
        />
        <Card>
          <EmptyState
            icon={<CalendarClock className="h-5 w-5" />}
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
        title="Visits"
        description="Plan, start and close site visits; every outcome feeds the ticket timeline and the OEM dashboard."
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
        <StatCard label="Upcoming visits" value={upcoming.length} tone="brand" icon={<CalendarClock className="h-4 w-4" aria-hidden />} />
        <StatCard label="Overdue upcoming" value={overdueUpcoming} tone={overdueUpcoming ? "warning" : "default"} icon={<AlertTriangle className="h-4 w-4" aria-hidden />} />
        <StatCard label="In progress on site" value={active.length} tone={active.length ? "success" : "default"} icon={<Play className="h-4 w-4" aria-hidden />} />
        <StatCard label="Completed all-time" value={past.filter((v) => v.status === "completed").length} icon={<CheckCircle2 className="h-4 w-4" aria-hidden />} />
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line no-scrollbar">
        {(
          [
            { key: "upcoming", label: "Upcoming", count: upcoming.length },
            { key: "active", label: "In progress", count: active.length },
            { key: "past", label: "Past outcomes", count: past.length },
          ] as const
        ).map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                isActive ? "text-brand-700" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-px text-[11px] font-semibold ${
                  isActive ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-ink-muted"
                }`}
              >
                {t.count}
              </span>
              {isActive && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {tabRows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<CalendarClock className="h-5 w-5" />}
              title="Nothing here yet"
              description={
                tab === "upcoming"
                  ? "No planned visits. Schedule one from an accepted assignment."
                  : tab === "active"
                    ? "No visit is currently in progress. Start a scheduled visit when you arrive on site."
                    : "Completed and closed visits will be listed here."
              }
              action={
                tab === "upcoming" ? (
                  <Link href="/engineer/assignments">
                    <Button variant="outline">Go to assignments</Button>
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <Table>
            <THead
              columns={[
                { label: "Ticket" },
                { label: "Engineer" },
                { label: "Scheduled" },
                { label: "Slot" },
                { label: "Status" },
                { label: "Actions" },
              ]}
            />
            <TBody>
              {tabRows.map((v) => {
                const t = ticketOf(v.ticketId);
                const late = v.status === "scheduled" && new Date(v.scheduledFor).getTime() < now;
                return (
                  <Tr key={v.id} onClick={() => setDetailId(v.id)}>
                    <Td>
                      <span className="font-mono text-[12px] font-medium text-ink">{t?.ref ?? "—"}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-faint">{t?.location.city}</span>
                    </Td>
                    <Td><span className="text-[12px]">{engineName(v.engineerId)}</span></Td>
                    <Td>
                      <span className={`text-[12px] ${late ? "font-medium text-danger-600" : "text-ink-soft"}`}>
                        {formatDateTime(v.scheduledFor)}
                      </span>
                    </Td>
                    <Td><span className="text-[12px]">{v.slot}</span></Td>
                    <Td>
                      <Badge
                        tone={
                          v.status === "completed"
                            ? "green"
                            : v.status === "in_progress"
                              ? "blue"
                              : v.status === "scheduled" || v.status === "rescheduled"
                                ? "cyan"
                                : "red"
                        }
                        dot
                      >
                        {VISIT_STATUS_LABELS[v.status] ?? v.status}
                      </Badge>
                    </Td>
                    <Td>
                      {v.status === "scheduled" || v.status === "rescheduled" ? (
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              startVisit(v.id);
                            }}
                          >
                            <Play className="h-3.5 w-3.5" aria-hidden /> Start
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionModal({ kind: "reschedule", visit: v });
                            }}
                          >
                            <RotateCw className="h-3.5 w-3.5" aria-hidden /> Reschedule
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelVisit({ visit: v, status: "cancelled" });
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5" aria-hidden /> Cancel
                          </Button>
                        </div>
                      ) : v.status === "in_progress" ? (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionModal({ kind: "close", visit: v });
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Close visit
                        </Button>
                      ) : (
                        <span className="text-[11px] text-ink-faint">
                          {v.reason ? v.reason : v.status === "completed" ? "Outcome logged" : "—"}
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

      {/* Reschedule modal */}
      {actionModal?.kind === "reschedule" && (
        <RescheduleModal
          visit={actionModal.visit}
          engineName={engineName(actionModal.visit.engineerId)}
          onClose={() => setActionModal(null)}
          onSubmit={(scheduledFor, slot, notes) => {
            // The store rotates previous scheduled visits into `rescheduled`
            // automatically when a new plan is created for the same ticket.
            scheduleVisit(actionModal.visit.ticketId, actionModal.visit.engineerId, scheduledFor, slot, notes);
            setActionModal(null);
          }}
        />
      )}

      {/* Close / complete modal */}
      {actionModal?.kind === "close" && (
        <CloseVisitModal
          onClose={() => setActionModal(null)}
          onSubmit={(status, reason) => {
            updateVisit(actionModal.visit.id, status, reason || undefined);
            setActionModal(null);
          }}
        />
      )}

      {/* Cancel confirm */}
      {cancelVisit && (
        <ConfirmDialog
          open
          onClose={() => setCancelVisit(null)}
          title="Cancel this visit?"
          message={
            <>
              <p>
                {ticketOf(cancelVisit.visit.ticketId)?.ref} ·{" "}
                {formatDateTime(cancelVisit.visit.scheduledFor)} ({cancelVisit.visit.slot})
              </p>
              <p className="mt-1 text-ink-muted">
                The ticket moves back to contact-pending and OEM managers are notified to re-plan.
              </p>
            </>
          }
          confirmLabel="Cancel visit"
          tone="danger"
          requireReason
          reasonLabel="Reason for cancelling"
          onConfirm={(reason) => {
            updateVisit(cancelVisit.visit.id, "cancelled", reason);
            setCancelVisit(null);
          }}
        />
      )}

      {/* Visit detail drawer */}
      <Drawer
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail ? `Visit — ${ticketOf(detail.ticketId)?.ref ?? detail.id}` : ""}
        description={detail ? `${VISIT_STATUS_LABELS[detail.status] ?? detail.status} · ${detail.slot}` : ""}
      >
        {detail && (
          <div className="space-y-4 text-[13px] leading-6 text-ink-soft">
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue" dot>{VISIT_STATUS_LABELS[detail.status] ?? detail.status}</Badge>
              <Badge tone="gray">{formatDate(detail.scheduledFor)}</Badge>
            </div>
            <section>
              <p className="font-medium text-ink">Ticket</p>
              <p className="mt-1">
                {ticketOf(detail.ticketId)?.ref} — {ticketOf(detail.ticketId)?.issue.category}
                <br />
                Customer: {ticketOf(detail.ticketId)?.contact.name} ·{" "}
                {ticketOf(detail.ticketId)?.contact.phone}
              </p>
            </section>
            {detail.notes && (
              <section>
                <p className="font-medium text-ink">Planning notes</p>
                <p className="mt-1">{detail.notes}</p>
              </section>
            )}
            {detail.reason && (
              <section>
                <p className="font-medium text-ink">Outcome note</p>
                <p className="mt-1">{detail.reason}</p>
              </section>
            )}
            {detail.customerContactedAt && (
              <p className="text-[12px] text-ink-muted">
                Customer first contacted {formatDateTime(detail.customerContactedAt)}.
              </p>
            )}
            {detail.evidence.length > 0 && (
              <section>
                <p className="font-medium text-ink">Attached evidence</p>
                <ul className="mt-1 space-y-1">
                  {detail.evidence.map((e) => (
                    <li key={e.id} className="rounded-md bg-surface-alt px-2.5 py-1.5 text-[12px]">
                      {e.name} <span className="text-ink-faint">· {e.sizeKb} KB · {e.uploadedBy}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <div className="flex justify-end gap-2 border-t border-line pt-3">
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

/* ---------------- modals ---------------- */

function RescheduleModal({
  visit,
  engineName,
  onClose,
  onSubmit,
}: {
  visit: Visit;
  engineName: string;
  onClose: () => void;
  onSubmit: (scheduledFor: string, slot: string, notes?: string) => void;
}) {
  const [date, setDate] = useState(new Date(visit.scheduledFor).toISOString().slice(0, 10));
  const [time, setTime] = useState(visit.scheduledFor.slice(11, 16));
  const [slot, setSlot] = useState(visit.slot);
  const [notes, setNotes] = useState(visit.notes ?? "");
  const [error, setError] = useState("");

  const submit = () => {
    const iso = new Date(`${date}T${time || "10:00"}:00`).toISOString();
    if (Number.isNaN(new Date(iso).getTime())) {
      setError("Invalid date/time.");
      return;
    }
    onSubmit(iso, slot, notes.trim() || undefined);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Reschedule visit"
      description={`Engineer: ${engineName} · new plan replaces the current one`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Save new plan</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Select
          label="Why rescheduling?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          options={[
            { value: "Customer requested later slot", label: "Customer requested later slot" },
            { value: "Site access not available", label: "Site access not available" },
            { value: "Parts not yet received", label: "Parts not yet received" },
            { value: "", label: "Custom / no reason" },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="New date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Input label="Start time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
        <Input label="Slot label" value={slot} onChange={(e) => setSlot(e.target.value)} />
        {error && <p className="text-xs text-danger-600">{error}</p>}
      </div>
    </Modal>
  );
}

function CloseVisitModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (status: VisitOutcome, reason: string) => void;
}) {
  const [status, setStatus] = useState<VisitOutcome>("completed");
  const [reason, setReason] = useState("");
  const failed = status === "failed" || status === "customer_unavailable" || status === "cancelled";

  return (
    <Modal
      open
      onClose={onClose}
      title="Close visit"
      description="Completed visits unlock the technical service report for the ticket."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Back</Button>
          <Button
            variant={failed ? "danger" : "success"}
            onClick={() => onSubmit(status, reason.trim())}
            disabled={failed && !reason.trim()}
          >
            {failed ? "Record failed outcome" : "Complete visit"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Select
          label="Outcome"
          value={status}
          onChange={(e) => setStatus(e.target.value as VisitOutcome)}
          options={[
            { value: "completed", label: "Completed — work done on site" },
            { value: "failed", label: "Failed — could not complete repair" },
            { value: "customer_unavailable", label: "Customer unavailable on site" },
            { value: "cancelled", label: "Cancelled before visit" },
          ]}
        />
        <Textarea
          label={failed ? "What went wrong?" : "Visit summary"}
          hint="Stored on the visit record and ticket timeline"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Torque check done, fuses replaced, generation restored…"
        />
      </div>
    </Modal>
  );
}
