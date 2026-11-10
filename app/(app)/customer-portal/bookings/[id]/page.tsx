"use client";

/**
 * Booking tracking — see "Agent coordination" in AGENTS.md
 * before editing this file.
 */

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  MapPin,
  Phone,
  Star,
  UserRound,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatDateTime, initials, maskPhone, relativeTime } from "@/lib/utils";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import type { TicketStatus } from "@/lib/types";

/** Customer-visible progress stages derived from ticket status. */
const STAGES: { label: string; reached: (s: TicketStatus, hasVisit: boolean) => boolean }[] = [
  { label: "Booking received", reached: () => true },
  { label: "Engineer offered", reached: (s) => s !== "new" && s !== "under_review" && s !== "awaiting_assignment" },
  { label: "Engineer assigned", reached: (s) =>
    ["accepted", "contact_pending", "visit_scheduled", "in_progress", "report_submitted", "awaiting_oem_review", "clarification_required", "escalated", "completed", "closed"].includes(s),
  },
  { label: "Visit planned", reached: (_s, hasVisit) => hasVisit },
  { label: "Service completed", reached: (s) => s === "completed" || s === "closed" },
];

export default function BookingTrackingPage() {
  const params = useParams<{ id: string }>();
  const { state } = useStore();

  const sessionIds = state.portalCustomerIds;
  const customer = state.customers.find((c) => sessionIds.includes(c.id));

  if (!customer) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<UserRound className="h-5 w-5" />}
          title="Start a portal session first"
          description="Booking tracking is available inside the customer portal."
          action={<Link href="/customer-portal"><Button>Open customer portal</Button></Link>}
        />
      </div>
    );
  }

  const siteIds = new Set(state.sites.filter((s) => s.customerId === customer.id).map((s) => s.id));
  const ticket = state.tickets.find(
    (t) => t.id === params.id && (t.customerId === customer.id || siteIds.has(t.siteId)),
  );

  if (!ticket) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<ClipboardList className="h-5 w-5" />}
          title="Booking not found"
          description="This booking does not belong to the current portal session, or the reference is invalid."
          action={<Link href="/customer-portal"><Button variant="outline">Back to portal</Button></Link>}
        />
      </div>
    );
  }

  const site = state.sites.find((s) => s.id === ticket.siteId);
  const equipment = state.equipment.find((e) => e.id === ticket.equipmentId);
  const engineer = state.engineers.find((e) => e.id === ticket.assignedEngineerId);
  const visits = state.visits.filter((v) => v.ticketId === ticket.id);
  const hasVisit = visits.length > 0;
  const timeline = ticket.timeline.slice().reverse();
  const currentStage = STAGES.reduce(
    (acc, s, i) => (s.reached(ticket.status, hasVisit) ? i : acc),
    0,
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`Booking ${ticket.ref}`}
        description="Live status of your service request — from booking to engineer visit."
        actions={
          <Link href="/customer-portal">
            <Button variant="ghost"><ArrowLeft className="h-4 w-4" /> Back to portal</Button>
          </Link>
        }
      />

      {/* status summary */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <Badge tone="blue">{ticket.source === "portal" ? "booked via portal" : ticket.source}</Badge>
          <span className="ml-auto text-xs text-ink-faint">Updated {relativeTime(ticket.updatedAt)}</span>
        </div>

        <ol className="mt-5 grid gap-3 sm:grid-cols-5">
          {STAGES.map((stage, i) => {
            const reached = stage.reached(ticket.status, hasVisit);
            return (
              <li key={stage.label} className="flex items-center gap-2 sm:block">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                    reached ? "bg-green-100 text-green-700" : "bg-surface-alt text-ink-faint"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`text-xs sm:mt-1.5 sm:block ${i === currentStage ? "font-medium text-ink" : "text-ink-faint"}`}>
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        {/* left: details + timeline */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Request details" />
            <dl className="space-y-2 px-5 pb-5 text-[13px]">
              {[
                ["Issue", `${ticket.issue.category}${ticket.issue.errorCode ? ` (${ticket.issue.errorCode})` : ""}`],
                ["Description", ticket.issue.description],
                ["Site", site ? `${site.name}, ${site.city}` : ticket.location.city],
                ["Equipment", equipment ? `${equipment.model} · SN ${equipment.serialNumber}` : ticket.product.model || "General visit"],
                ["Preferred slot", ticket.contact.availability],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[130px_1fr] gap-3 rounded-lg bg-surface-alt/60 px-3 py-2">
                  <dt className="text-ink-faint">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Visit plan" description={visits.length ? "Confirmed visit windows for this booking." : "The engineer will call to agree a visit window."} />
            <ul className="space-y-2.5 px-5 pb-5">
              {visits.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      <CalendarClock className="h-3.5 w-3.5 text-brand-600" /> {formatDateTime(v.scheduledFor)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">{v.slot}{v.notes ? ` · ${v.notes}` : ""}</p>
                  </div>
                  <Badge tone={v.status === "completed" ? "green" : v.status === "scheduled" ? "blue" : "amber"}>
                    {v.status.replace(/_/g, " ")}
                  </Badge>
                </li>
              ))}
              {visits.length === 0 && (
                <li className="text-[13px] text-ink-muted">
                  No visit scheduled yet — you will see it here as soon as the engineer books a window.
                </li>
              )}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Activity" description="Every update on your booking, newest first." />
            <ol className="space-y-0 px-5 pb-5">
              {timeline.map((ev) => (
                <li key={ev.id} className="relative border-l border-line pb-4 pl-4 last:pb-0">
                  <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-brand-400" />
                  <p className="text-[13px] font-medium text-ink">{ev.title}</p>
                  {ev.detail && <p className="mt-0.5 text-xs leading-5 text-ink-muted">{ev.detail}</p>}
                  <p className="mt-0.5 text-[11px] text-ink-faint">
                    {formatDateTime(ev.at)} · {relativeTime(ev.at)}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* right: engineer card */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Your engineer" />
            {engineer ? (
              <div className="px-5 pb-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    {initials(engineer.name)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{engineer.name}</p>
                    <p className="text-xs text-ink-muted">
                      {engineer.city} · {engineer.experienceYears} yrs experience
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-surface-alt/60 px-2 py-2.5">
                    <p className="flex items-center justify-center gap-1 text-sm font-semibold text-ink">
                      <Star className="h-3.5 w-3.5 text-amber-500" /> {engineer.rating.toFixed(1)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-ink-faint">Rating</p>
                  </div>
                  <div className="rounded-lg bg-surface-alt/60 px-2 py-2.5">
                    <p className="text-sm font-semibold text-ink">{engineer.completedJobs}</p>
                    <p className="text-[10px] uppercase tracking-wide text-ink-faint">Jobs done</p>
                  </div>
                  <div className="rounded-lg bg-surface-alt/60 px-2 py-2.5">
                    <p className="text-sm font-semibold text-ink">{engineer.avgResponseMins}m</p>
                    <p className="text-[10px] uppercase tracking-wide text-ink-faint">Responds in</p>
                  </div>
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-muted">
                  <Phone className="h-3.5 w-3.5" /> {maskPhone(engineer.phone)}
                  <span className="text-ink-faint">(revealed after acceptance)</span>
                </p>
              </div>
            ) : (
              <div className="px-5 pb-5 text-[13px] text-ink-muted">
                {ticket.status === "offered"
                  ? "An offer is out to a matched engineer — awaiting their acceptance."
                  : "No engineer assigned yet. The OEM service desk is on it — this usually happens within a few hours."}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Need another visit?" />
            <div className="px-5 pb-5">
              <p className="text-[13px] leading-5 text-ink-muted">
                For a new problem, log a fresh booking — it keeps history and warranty evidence clean.
              </p>
              <Link href="/customer-portal/book" className="mt-3 inline-block">
                <Button variant="outline"><Wrench className="h-4 w-4" /> Book another service</Button>
              </Link>
            </div>
          </Card>

          <p className="flex items-start gap-2 px-1 text-xs leading-5 text-ink-faint">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Warranty and repair decisions remain with the OEM. RAYVIQ coordinates scheduling and documentation only.
          </p>
        </div>
      </div>
    </div>
  );
}
