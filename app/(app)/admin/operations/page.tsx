"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlarmClock,
  Ban,
  ArrowRightLeft,
  ListChecks,
  Timer,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { OPEN_STATUSES } from "@/lib/constants";
import { recommendEngineers, type Recommendation } from "@/lib/selectors";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/states";
import { Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { ProgressBar } from "@/components/charts";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatDate, formatDateTime, initials, isOverdue, relativeTime } from "@/lib/utils";
import type { Assignment, Ticket } from "@/lib/types";

export default function AdminOperationsPage() {
  const router = useRouter();
  const { state, revokeOffer } = useStore();

  const [assignTicketId, setAssignTicketId] = useState<Ticket | null>(null);
  const [revokeAsg, setRevokeAsg] = useState<Assignment | null>(null);

  const open = useMemo(() => state.tickets.filter((t) => OPEN_STATUSES.includes(t.status)), [state.tickets]);

  const queue = open.filter((t) => t.status === "awaiting_assignment");

  const pendingOffers = useMemo(
    () =>
      state.assignments
        .filter((a) => a.state === "pending_offer")
        .map((a) => ({ a, t: state.tickets.find((x) => x.id === a.ticketId) }))
        .filter((r): r is { a: Assignment; t: Ticket } => Boolean(r.t))
        .sort((x, y) => (x.a.responseDeadline < y.a.responseDeadline ? -1 : 1)),
    [state],
  );

  const noResponse = useMemo(
    () =>
      state.assignments
        .filter((a) => a.state === "no_response")
        .map((a) => ({ a, t: state.tickets.find((x) => x.id === a.ticketId) }))
        .filter((r): r is { a: Assignment; t: Ticket } => Boolean(r.t)),
    [state],
  );

  const escalated = open.filter((t) => t.status === "escalated");
  const breached = open.filter((t) => t.sla.breached || isOverdue(t.sla.resolutionDueAt));

  const assignmentHealth = Math.max(
    0,
    Math.min(100, (1 - breached.length / Math.max(1, open.length)) * 100),
  );

  const engineerName = (id: string) => state.engineers.find((e) => e.id === id)?.name ?? "Engineer";

  return (
    <div>
      <PageHeader
        title="Assignment operations"
        description="Intervene anywhere in the dispatch loop — revoke stalled offers, re-assign from the queue and track SLA exposure."
        breadcrumbs={<Breadcrumbs />}
        actions={<Badge tone={breached.length ? "red" : "green"} dot>{breached.length} SLA breaches</Badge>}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assignment queue" value={queue.length} tone="brand" icon={<ListChecks className="h-4 w-4" aria-hidden />} hint="Tickets waiting for an engineer" />
        <StatCard label="Offers pending response" value={pendingOffers.length} tone={pendingOffers.length ? "warning" : "default"} icon={<AlarmClock className="h-4 w-4" aria-hidden />} hint="Awaiting engineer response" />
        <StatCard label="No-response offers" value={noResponse.length} icon={<ArrowRightLeft className="h-4 w-4" aria-hidden />} hint="Fallback re-assignment candidates" />
        <StatCard label="Escalated tickets" value={escalated.length} tone={escalated.length ? "danger" : "success"} icon={<Activity className="h-4 w-4" aria-hidden />} />
      </div>

      <Card className="mb-6">
        <CardHeader
          title="Open workload health"
          description={`${open.length} open tickets · ${breached.length} past their resolution due date`}
        />
        <ProgressBar value={assignmentHealth} tone={assignmentHealth > 85 ? "success" : assignmentHealth > 60 ? "warning" : "danger"} />
        <div className="mt-2 flex flex-wrap justify-between text-[12px] text-ink-muted">
          <span>Healthy share: {Math.round(assignmentHealth)}%</span>
          <span>
            Avg response target {state.settings.assignment.offerTimeoutMins} min offer window · strategy{" "}
            {state.settings.assignment.strategy.replace(/_/g, " ")}
          </span>
        </div>
      </Card>

      {/* Pending offers */}
      <div className="mb-6 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <div className="border-b border-line px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-ink">Offers awaiting engineer response</h3>
          <p className="mt-0.5 text-[13px] text-ink-muted">Revoke stalled offers to return tickets to the queue.</p>
        </div>
        {pendingOffers.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<AlarmClock className="h-5 w-5" />}
              title="No offers pending"
              description="Every dispatched offer has been answered. New offers appear here with their countdown."
            />
          </div>
        ) : (
          <Table>
            <THead
              columns={[
                { label: "Ticket" },
                { label: "Engineer" },
                { label: "Priority" },
                { label: "Offered" },
                { label: "Deadline" },
                { label: "Actions" },
              ]}
            />
            <TBody>
              {pendingOffers.map(({ a, t }) => {
                const late = isOverdue(a.responseDeadline);
                return (
                  <Tr key={a.id} onClick={() => router.push(`/oem/tickets/${t.id}`)}>
                    <Td>
                      <span className="font-mono text-[12px] font-medium text-ink">{t.ref}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-faint">{t.location.city}</span>
                    </Td>
                    <Td>
                      <p className="text-[13px] text-ink">{engineerName(a.engineerId)}</p>
                      <p className="text-[11px] text-ink-faint">{relativeTime(a.assignedAt)}</p>
                    </Td>
                    <Td><PriorityBadge priority={t.priority} /></Td>
                    <Td><span className="text-[12px]">{formatDateTime(a.assignedAt)}</span></Td>
                    <Td>
                      <span className={`text-[12px] ${late ? "font-medium text-danger-600" : "text-ink-soft"}`}>
                        {formatDateTime(a.responseDeadline)}
                      </span>
                      {late && <Badge tone="red" className="ml-1.5">Expired</Badge>}
                    </Td>
                    <Td>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRevokeAsg(a);
                        }}
                      >
                        <Ban className="h-3.5 w-3.5" aria-hidden /> Revoke
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </div>

      {/* Manual assignment queue */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <div className="border-b border-line px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-ink">Assignment queue</h3>
          <p className="mt-0.5 text-[13px] text-ink-muted">Manually dispatch tickets, or review the recommendation engine picks.</p>
        </div>
        {queue.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<ListChecks className="h-5 w-5" />}
              title="Queue is empty"
              description="No tickets are waiting for assignment right now."
            />
          </div>
        ) : (
          <Table>
            <THead
              columns={[
                { label: "Ticket" },
                { label: "Issue" },
                { label: "Priority" },
                { label: "Status" },
                { label: "Age" },
                { label: "" },
              ]}
            />
            <TBody>
              {queue.map((t) => (
                <Tr key={t.id} onClick={() => router.push(`/oem/tickets/${t.id}`)}>
                  <Td>
                    <span className="font-mono text-[12px] font-medium text-ink">{t.ref}</span>
                    <span className="mt-0.5 block text-[11px] text-ink-faint">
                      {t.location.city}, {t.location.state}
                    </span>
                  </Td>
                  <Td className="max-w-56">
                    <p className="truncate text-[13px]">{t.issue.category}</p>
                  </Td>
                  <Td><PriorityBadge priority={t.priority} /></Td>
                  <Td><StatusBadge status={t.status} /></Td>
                  <Td>
                    <span className={`text-[12px] ${isOverdue(t.sla.assignmentDueAt) ? "font-medium text-danger-600" : "text-ink-soft"}`}>
                      {relativeTime(t.createdAt)}
                    </span>
                  </Td>
                  <Td>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssignTicketId(t);
                      }}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden /> Dispatch
                    </Button>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      {/* Revoke confirm */}
      {revokeAsg && (
        <ConfirmDialog
          open
          onClose={() => setRevokeAsg(null)}
          title="Revoke this offer?"
          message={
            <>
              <p>
                {state.tickets.find((t) => t.id === revokeAsg.ticketId)?.ref} → {engineerName(revokeAsg.engineerId)}
              </p>
              <p className="mt-1 text-ink-muted">
                The ticket returns to the assignment queue and can be re-dispatched immediately.
              </p>
            </>
          }
          confirmLabel="Revoke offer"
          tone="danger"
          onConfirm={() => {
            revokeOffer(revokeAsg.id);
            setRevokeAsg(null);
          }}
        />
      )}

      {/* Manual dispatch modal */}
      {assignTicketId && (
        <DispatchModal
          ticketId={assignTicketId.id}
          onClose={() => setAssignTicketId(null)}
        />
      )}
    </div>
  );
}

function DispatchModal({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const { state, assignTicket, toast } = useStore();
  const router = useRouter();
  const t = state.tickets.find((x) => x.id === ticketId) ?? null;
  const recs: Recommendation[] = t ? recommendEngineers(state, t, 5) : [];

  if (!t) return null;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Dispatch ${t.ref}`}
      description="Recommendations are scored on location, product expertise, skills, availability, workload and rating."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="secondary" onClick={() => router.push(`/oem/tickets/${t.id}`)}>
            Open full ticket
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-[13px] text-ink-soft">
          {t.issue.category} · {t.location.city}, {t.location.state} · expires {formatDate(t.dueAt)}
        </p>
        {recs.length === 0 ? (
          <EmptyState
            icon={<Timer className="h-5 w-5" />}
            title="No eligible engineers"
            description="All matching engineers are suspended, unverified or exclusive to another OEM."
          />
        ) : (
          recs.map((r) => (
            <div key={r.engineer.id} className="rounded-lg border border-line bg-surface-alt p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">
                    {initials(r.engineer.name)}
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-ink">{r.engineer.name}</p>
                    <p className="text-[11px] text-ink-faint">
                      {r.engineer.city}, {r.engineer.state} · score {r.score} · {r.engineer.currentLoad}/{r.engineer.maxLoad} load
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    assignTicket(t.id, r.engineer.id);
                    toast(`Ticket dispatched to ${r.engineer.name}`);
                    onClose();
                  }}
                >
                  Assign
                </Button>
              </div>
              {r.reasons.length > 0 && (
                <ul className="mt-2 ml-6 list-disc space-y-0.5 text-[12px] text-success-700">
                  {r.reasons.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              )}
              {r.concerns.length > 0 && (
                <ul className="mt-1 ml-6 list-disc space-y-0.5 text-[12px] text-ink-muted">
                  {r.concerns.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
