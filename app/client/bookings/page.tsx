"use client";

import Link from "next/link";
import {
  CalendarClock,
  ChevronRight,
  ClipboardList,
  MapPin,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { TICKET_STATUS_TONES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { PersonPhoto } from "@/components/ui/person-photo";
import { cn, formatDate, relativeTime } from "@/lib/utils";

const AVATAR_COLORS = ["#2554e0", "#0e7c66", "#b45309", "#7c3aed", "#be123c", "#0369a1", "#a16207"];

function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

const PRIORITY_TONE = {
  critical: "red",
  high: "amber",
  medium: "blue",
  low: "gray",
} as const;

/** Short status labels — the full ones ("Clarification Required") overflow a 2-up card. */
const SHORT_STATUS: Record<string, string> = {
  new: "New",
  under_review: "Review",
  awaiting_assignment: "Awaiting",
  offered: "Offered",
  accepted: "Accepted",
  rejected: "Rejected",
  contact_pending: "Contact",
  visit_scheduled: "Scheduled",
  in_progress: "On site",
  report_submitted: "Reported",
  awaiting_oem_review: "OEM review",
  clarification_required: "Clarify",
  escalated: "Escalated",
  completed: "Completed",
  closed: "Closed",
};

/** Client bookings list — compact two-up cards, tuned for narrow mobile screens. */
export default function ClientBookingsPage() {
  const { state } = useStore();

  const customer = state.customers.find((c) => state.portalCustomerIds.includes(c.id)) ?? null;

  if (!customer) {
    return (
      <Card className="p-5">
        <EmptyState
          icon={<UserRound className="h-5 w-5" />}
          title="You're not signed in"
          description="Sign in with your mobile number to see your bookings."
          action={
            <Link href="/client/login">
              <Button>Sign in to client app</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const sites = state.sites.filter((s) => s.customerId === customer.id);
  const siteIds = new Set(sites.map((s) => s.id));
  const tickets = state.tickets
    .filter((t) => t.customerId === customer.id || siteIds.has(t.siteId))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const openCount = tickets.filter((t) => t.status !== "closed" && t.status !== "completed").length;
  const completedCount = tickets.filter((t) => t.status === "completed" || t.status === "closed").length;

  return (
    <div className="space-y-4">
      {/* ---------- Compact hero ---------- */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink via-brand-900 to-brand-800 p-4 text-white sm:p-5">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand-500/30 blur-3xl" />
        </div>
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/20">
            <MapPin className="h-3 w-3 text-accent-400" aria-hidden />
            {customer.city}, {customer.state}
          </span>
          <h1 className="mt-2.5 text-xl font-bold tracking-tight sm:text-2xl">My bookings</h1>
          <p className="mt-1 text-[13px] leading-5 text-white/75">
            {tickets.length} request{tickets.length === 1 ? "" : "s"} for{" "}
            <span className="font-semibold text-white">{customer.name}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatPill label="Open" value={openCount} className="text-brand-300" />
            <StatPill label="Done" value={completedCount} className="text-success-300" />
            <StatPill label="Response" value="~18m" className="text-accent-300" />
          </div>
        </div>
      </section>

      {/* ---------- Empty state ---------- */}
      {tickets.length === 0 && (
        <Card className="p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
            <ClipboardList className="h-6 w-6 text-brand-600" aria-hidden />
          </span>
          <h2 className="mt-3 text-[15px] font-semibold text-ink">No bookings yet</h2>
          <p className="mx-auto mt-1 max-w-xs text-[13px] leading-6 text-ink-muted">
            Book a verified engineer for your inverter and track every visit right here.
          </p>
          <div className="mt-4 flex justify-center">
            <Link href="/marketplace">
              <Button size="sm">
                <Wrench className="h-4 w-4" /> Browse experts
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* ---------- Two-up compact cards ---------- */}
      {tickets.length > 0 && (
        <ul className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
          {tickets.map((t) => {
            const site = state.sites.find((s) => s.id === t.siteId);
            const engineer = state.engineers.find((e) => e.id === t.assignedEngineerId);
            const visit = state.visits.find((v) => v.ticketId === t.id);
            const isActive = t.status !== "closed" && t.status !== "completed";

            return (
              <li key={t.id}>
                <Link
                  href={`/client/tickets/${t.id}`}
                  className={cn(
                    "group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-pop",
                    !isActive && "opacity-80",
                  )}
                >
                  {/* Top strip: priority + status */}
                  <div className="flex items-center gap-1.5 border-b border-line/60 px-3 py-2">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        t.priority === "critical"
                          ? "bg-danger-500"
                          : t.priority === "high"
                            ? "bg-warning-500"
                            : t.priority === "medium"
                              ? "bg-brand-500"
                              : "bg-ink-faint",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-medium text-ink-muted">
                      {t.ref}
                    </span>
                    <span className="ml-auto shrink-0">
                      <Badge tone={TICKET_STATUS_TONES[t.status]} className="text-[10px]">
                        {SHORT_STATUS[t.status] ?? t.status}
                      </Badge>
                    </span>
                  </div>

                  {/* Title */}
                  <div className="px-3 pt-2.5">
                    <p className="truncate text-[13.5px] font-semibold leading-5 tracking-tight text-ink">
                      {t.issue.category}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-faint">{relativeTime(t.updatedAt)}</p>
                  </div>

                  {/* Engineer */}
                  <div className="px-3 pt-2.5">
                    {engineer ? (
                      <div className="flex items-center gap-1.5">
                        <PersonPhoto
                          id={engineer.id}
                          name={engineer.name}
                          className="h-6 w-6 rounded-full text-[9px] ring-1 ring-white"
                          backgroundColor={avatarColor(engineer.name)}
                        />
                        <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">
                          {engineer.name}
                        </p>
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            engineer.availability === "available"
                              ? "bg-success-500"
                              : engineer.availability === "busy"
                                ? "bg-warning-500"
                                : "bg-ink-faint/60",
                          )}
                          aria-hidden
                        />
                      </div>
                    ) : (
                      <p className="flex items-center gap-1.5 truncate text-[12px] text-ink-faint">
                        <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                        Assigning engineer
                      </p>
                    )}
                  </div>

                  {/* Site + visit */}
                  <div className="space-y-1 px-3 pt-2">
                    <p className="flex items-center gap-1 text-[11.5px] text-ink-muted">
                      <MapPin className="h-3 w-3 shrink-0 text-ink-faint" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{site?.name ?? "—"}</span>
                    </p>
                    {visit && (
                      <p className="flex items-center gap-1 text-[11.5px] text-ink-muted">
                        <CalendarClock className="h-3 w-3 shrink-0 text-ink-faint" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{formatDate(visit.scheduledFor)}</span>
                      </p>
                    )}
                  </div>

                  {/* Description (clamped) */}
                  <p className="mt-2 line-clamp-2 px-3 text-[11.5px] leading-5 text-ink-soft">
                    {t.issue.description}
                  </p>

                  {/* Footer */}
                  <div className="mt-auto flex items-center justify-between gap-1.5 border-t border-line/60 px-3 py-2">
                    <Badge
                      tone={t.source === "portal" ? "green" : PRIORITY_TONE[t.priority]}
                      className="max-w-[110px] truncate text-[10px]"
                    >
                      {t.source === "portal" ? "In app" : t.priority}
                    </Badge>
                    <span className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-brand-700">
                      Details
                      <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* ---------- Quick action ---------- */}
      <Card className="p-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50">
            <Wrench className="h-4 w-4 text-brand-600" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-ink">Need another repair?</p>
            <p className="text-[11.5px] text-ink-muted">Book a verified engineer in under a minute.</p>
          </div>
          <Link href="/marketplace" className="shrink-0">
            <Button variant="outline" size="sm">
              Browse <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

function StatPill({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className="rounded-xl bg-white/10 px-2.5 py-1.5 ring-1 ring-white/10">
      <p className="text-[9.5px] font-semibold uppercase tracking-widest text-white/50">{label}</p>
      <p className={cn("text-[15px] font-bold", className)}>{value}</p>
    </div>
  );
}
