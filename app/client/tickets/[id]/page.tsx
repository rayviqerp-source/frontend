"use client";

import Link from "next/link";
import { Suspense, use } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Clock,
  FileText,
  MapPin,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { TICKET_STATUS_LABELS } from "@/lib/constants";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingScreen } from "@/components/ui/states";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";

/**
 * Client-facing ticket detail page — read-only, premium.
 * `use(params)` must sit inside a Suspense boundary, otherwise Next 16
 * prerendering fails with "uncached or runtime data during prerendering".
 */
export default function ClientTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading booking…" />}>
      <TicketDetailContent params={params} />
    </Suspense>
  );
}

function TicketDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading ticket…" />}>
      <ClientTicketDetailContent params={params} />
    </Suspense>
  );
}

function ClientTicketDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { state } = useStore();

  const ticket = state.tickets.find((t) => t.id === id);
  const site = state.sites.find((s) => s.id === ticket?.siteId);
  const engineer = state.engineers.find((e) => e.id === ticket?.assignedEngineerId);
  const visit = state.visits.find((v) => v.ticketId === id);

  if (!ticket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
        <Card className="p-8 md:p-12">
          <EmptyState
            icon={<AlertTriangle className="h-6 w-6" />}
            title="Booking not found"
            description="This service request doesn’t exist or may have been removed."
            action={
              <>
                <Link href="/client/bookings">
                  <Button variant="outline">My bookings</Button>
                </Link>
                <Link href="/dashboard" className="mt-3 inline-block">
                  <Button>Go to dashboard</Button>
                </Link>
              </>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/client/bookings"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> My bookings
        </Link>
        <StatusBadge status={ticket.status} />
      </div>

      {/* Hero: ref + priority */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Service request
            </p>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink">
              {ticket.ref}
              <Badge tone="blue">{ticket.source === "portal" ? "App" : ticket.source}</Badge>
            </h1>
            <p className="mt-1 text-xs text-ink-faint">
              {ticket.source === "portal" ? "Booked via RAYVIQ app" : ticket.source}
            </p>
          </div>
          <div className="flex items-end gap-2">
            <Badge
              tone={
                ticket.priority === "critical"
                  ? "red"
                  : ticket.priority === "high"
                    ? "amber"
                    : ticket.priority === "medium"
                      ? "blue"
                      : "gray"
              }
              className="text-xs font-bold uppercase tracking-wider"
            >
              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
            </Badge>
            <span className="text-[11px] font-medium text-ink-muted">
              {relativeTime(ticket.updatedAt)}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <StatBox label="Status" value={TICKET_STATUS_LABELS[ticket.status]} />
          <StatBox label="Site" value={site?.name ?? "—"} />
          <StatBox label="City" value={site?.city ?? "—"} />
          <StatBox
            label="Priority"
            value={ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
          />
        </div>
      </Card>

      {/* Issue */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-brand-600" aria-hidden />
          <h2 className="text-sm font-semibold tracking-tight text-ink">Issue</h2>
        </div>
        <p className="text-[13px] leading-6 text-ink-soft">{ticket.issue.description}</p>
        {ticket.issue.errorCode && (
          <div className="mt-3 rounded-lg border border-line bg-surface-alt/60 px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Error code
            </p>
            <p className="mt-0.5 font-mono text-xs font-medium text-ink">
              {ticket.issue.errorCode}
            </p>
          </div>
        )}
      </Card>

      {/* Site & engineer */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-brand-600" aria-hidden />
            <h2 className="text-sm font-semibold tracking-tight text-ink">Site</h2>
          </div>
          <p className="text-[13px] font-medium text-ink">{site?.name ?? "—"}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {site?.address ?? "—"}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-muted">
            <span className="h-1 w-1 rounded-full bg-ink-muted" />
            {site?.city}, {site?.state} {site?.pincode}
          </p>
          {site?.capacityKw && (
            <p className="mt-1 text-[11px] text-ink-muted">
              {site.capacityKw} kW · {site.siteType.replace(/_/g, " ")}
            </p>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <UserRound className="h-4 w-4 text-brand-600" aria-hidden />
            <h2 className="text-sm font-semibold tracking-tight text-ink">
              Assigned engineer
            </h2>
          </div>
          {engineer ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                    engineer.availability === "available"
                      ? "bg-success-600"
                      : engineer.availability === "busy"
                        ? "bg-amber-500"
                        : "bg-ink-faint"
                  }`}
                >
                  {engineer.name.split(" ").map((n) => n[0]).join("")}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{engineer.name}</p>
                  <p className="text-[11px] text-ink-muted">
                    {engineer.city}, {engineer.state} · {engineer.experienceYears} yrs
                  </p>
                </div>
                <Badge
                  tone={
                    engineer.availability === "available"
                      ? "green"
                      : engineer.availability === "busy"
                        ? "amber"
                        : "gray"
                  }
                >
                  {engineer.availability.charAt(0).toUpperCase() + engineer.availability.slice(1)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {engineer.skills.slice(0, 3).map((s) => (
                  <Badge key={s} tone="blue" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
              <Link
                href="/engineer/profile"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 transition-colors hover:text-brand-700"
              >
                View engineer profile <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="text-center py-4">
              <UserRound className="mx-auto h-8 w-8 text-ink-faint" aria-hidden />
              <p className="mt-2 text-[12px] text-ink-muted">No engineer assigned yet</p>
            </div>
          )}
        </Card>
      </div>

      {/* Visit */}
      {visit && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="h-4 w-4 text-brand-600" aria-hidden />
            <h2 className="text-sm font-semibold tracking-tight text-ink">Site visit</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatBox label="Date" value={formatDateTime(visit.scheduledFor)} />
            <StatBox label="Slot" value={visit.slot} />
            <StatBox
              label="Status"
              value={visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
            />
          </div>
          {visit.notes && (
            <div className="mt-3 rounded-lg border border-line bg-surface-alt/60 px-3.5 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                Engineer notes
              </p>
              <p className="mt-1 text-[13px] leading-6 text-ink-soft">{visit.notes}</p>
            </div>
          )}
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-brand-600" aria-hidden />
          <h2 className="text-sm font-semibold tracking-tight text-ink">Timeline</h2>
        </div>
        <div className="relative pl-6">
          {[...ticket.timeline].reverse().map((e) => (
            <div key={e.id} className="relative mb-6 last:mb-0">
              <span
                className={cn(
                  "absolute -left-[23px] top-2 h-3 w-3 rounded-full ring-4 ring-surface shadow-card",
                  e.type === "escalation"
                    ? "bg-danger-500"
                    : e.type === "closure" || e.type === "review"
                      ? "bg-success-500"
                      : e.type === "assignment" || e.type === "offer"
                        ? "bg-accent-500"
                        : "bg-brand-500",
                )}
              />
              <div className="flex items-start gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{e.title}</p>
                  {e.detail && (
                    <p className="mt-0.5 text-[12px] leading-5 text-ink-soft">{e.detail}</p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-ink-faint">
                  {formatDateTime(e.at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Bottom CTA */}
      <Card className="p-4">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-alt/50 px-3 py-3 shadow-sm">
          <Sparkles className="h-4 w-4 text-brand-600" aria-hidden />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">Need help?</p>
            <p className="text-[11px] text-ink-muted">Chat with support or request a re-visit.</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm">
              Call support <Phone className="ml-2 h-3 w-3" />
            </Button>
            <Link href="/client/bookings">
              <Button variant="primary" size="sm">
                Back to bookings <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-alt/60 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
        {label}
      </p>
      <p className="mt-0.5 text-[12px] font-semibold text-ink">{value}</p>
    </div>
  );
}
