"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Sparkles,
  Star,
  Users,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useEngineerTickets, useMyEngineer } from "@/lib/session";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { PersonPhoto } from "@/components/ui/person-photo";
import { formatDate, relativeTime } from "@/lib/utils";

const AVATAR_COLORS = ["#2554e0", "#0e7c66", "#b45309", "#7c3aed", "#be123c", "#0369a1", "#a16207"];

function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

/**
 * Home content for the engineer portal.
 *
 * Engineers must NOT see the whole marketplace network on their dashboard —
 * that is OEM / admin information. They see their own work: open offers,
 * upcoming visits and their own performance. A partner manager (service
 * partner) instead sees their own team roster.
 */
export function EngineerHome() {
  const { state, effectiveRole, currentUser } = useStore();
  const engineer = useMyEngineer();
  const { offers, active, completed } = useEngineerTickets();

  const isPartnerManager = effectiveRole === "partner_manager";

  /* Partner managers see only their own partner's engineers. */
  const team = useMemo(() => {
    const partnerId =
      currentUser?.partnerId ??
      state.engineers.find((e) => e.id === engineer?.id)?.partnerId ??
      null;
    if (!partnerId) return [];
    return state.engineers.filter(
      (e) => e.partnerId === partnerId && e.status !== "inactive",
    );
  }, [currentUser, state.engineers, engineer]);

  const myVisits = useMemo(
    () =>
      state.visits
        .filter((v) => v.engineerId === engineer?.id && (v.status === "scheduled" || v.status === "in_progress"))
        .sort((a, b) => (a.scheduledFor < b.scheduledFor ? -1 : 1))
        .slice(0, 4),
    [state.visits, engineer],
  );

  /* ---------------- Partner manager: own team ---------------- */
  if (isPartnerManager) {
    return (
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-ink">Your team</h2>
            <p className="text-xs text-ink-muted">
              {team.length} technician{team.length === 1 ? "" : "s"} at your service partner
            </p>
          </div>
          <Link
            href="/vendor/engineers"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:text-brand-700"
          >
            Manage team <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {team.length === 0 ? (
          <Card className="p-4">
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title="No engineers onboarded yet"
              description="Onboard your first technician to start receiving OEM dispatch offers."
              action={
                <Link href="/vendor/onboarding">
                  <Button size="sm">Onboard engineer</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <ul className="grid gap-3 sm:gap-5 lg:grid-cols-3">
            {team.slice(0, 6).map((e) => (
              <li key={e.id}>
                <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                  <div
                    className="relative h-24 shrink-0 overflow-hidden"
                    style={{ backgroundColor: avatarColor(e.name) }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/25" aria-hidden />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <PersonPhoto
                        id={e.id}
                        name={e.name}
                        backgroundColor={avatarColor(e.name)}
                        className="h-14 w-14 rounded-2xl text-base ring-2 ring-white/80 shadow-pop"
                      />
                    </span>
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          e.availability === "available"
                            ? "bg-success-400"
                            : e.availability === "busy"
                              ? "bg-warning-400"
                              : "bg-white/50"
                        }`}
                        aria-hidden
                      />
                      {e.availability === "available" ? "Available" : e.availability === "busy" ? "On a job" : "Offline"}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-3.5">
                    <p className="truncate text-[14px] font-semibold tracking-tight text-ink">{e.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-ink-muted">
                      <MapPin className="h-3 w-3 shrink-0 text-ink-faint" aria-hidden />
                      {e.city}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2.5 text-[12px]">
                      <span className="font-semibold text-ink">{e.completedJobs} jobs</span>
                      <span className="flex items-center gap-1 text-ink-muted">
                        <Star className="h-3 w-3 fill-warning-400 text-warning-400" aria-hidden />
                        {e.rating > 0 ? e.rating.toFixed(1) : "New"}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  /* ---------------- Engineer: own work ---------------- */
  return (
    <div className="mt-6 space-y-5">
      {/* Your performance */}
      {engineer && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Your rating"
            value={`${engineer.rating.toFixed(1)}/5`}
            hint={`${engineer.completedJobs} jobs completed`}
            icon={<Star className="h-4 w-4" />}
            tone="success"
          />
          <StatCard
            label="Acceptance rate"
            value={`${engineer.acceptanceRate}%`}
            hint={`${engineer.rejectionRate}% declined`}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <StatCard
            label="Active assignments"
            value={active.length}
            hint="Currently with you"
            icon={<ClipboardList className="h-4 w-4" />}
            tone="brand"
          />
          <StatCard
            label="Reports submitted"
            value={completed.length}
            hint="Completed lifetime"
            icon={<Wrench className="h-4 w-4" />}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Offers awaiting you */}
        <Card padded={false}>
          <div className="px-5 pt-5">
            <CardHeader
              title="Offers awaiting you"
              description="Respond before the SLA deadline to protect your acceptance rate."
              action={
                <Link href="/engineer/requests" className="text-[12px] font-medium text-brand-700 hover:text-brand-800">
                  View all
                </Link>
              }
            />
          </div>
          {offers.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                icon={<Sparkles className="h-5 w-5" />}
                title="No open offers"
                description="New requests matching your skills and location will appear here."
                action={
                  <Link href="/engineer/requests">
                    <Button size="sm" variant="outline">
                      Browse open requests
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {offers.slice(0, 4).map((t) => (
                <li key={t.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[12px] font-medium text-ink">{t.ref}</span>
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="mt-1 text-[13px] font-medium text-ink">{t.issue.category}</p>
                  <p className="text-[11.5px] text-ink-muted">
                    {t.contact.name} · {t.location.city}, {t.location.state}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Upcoming visits */}
        <Card padded={false}>
          <div className="px-5 pt-5">
            <CardHeader
              title="Your upcoming visits"
              description="Field visits scheduled to you."
              action={
                <Link href="/engineer/visits" className="text-[12px] font-medium text-brand-700 hover:text-brand-800">
                  View all
                </Link>
              }
            />
          </div>
          {myVisits.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                icon={<CalendarClock className="h-5 w-5" />}
                title="No visits scheduled"
                description="Accepted jobs show up here once a visit is planned."
              />
            </div>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {myVisits.map((v) => {
                const ticket = state.tickets.find((t) => t.id === v.ticketId);
                return (
                  <li key={v.id} className="flex items-start gap-3 px-5 py-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <CalendarClock className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {ticket?.issue.category ?? "Service visit"}
                      </p>
                      <p className="text-[11.5px] text-ink-muted">
                        {formatDate(v.scheduledFor)} · {v.slot}
                      </p>
                    </div>
                    {ticket && (
                      <Link
                        href={`/engineer/assignments/${ticket.id}`}
                        className="shrink-0 text-[12px] font-medium text-brand-700 hover:underline"
                      >
                        Open
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent activity on your work */}
      <Card padded={false}>
        <div className="px-5 pt-5">
          <CardHeader
            title="Your recent work"
            description="Latest movement on the tickets assigned to you."
            action={
              <Link href="/engineer/assignments" className="text-[12px] font-medium text-brand-700 hover:text-brand-800">
                All assignments
              </Link>
            }
          />
        </div>
        {active.length === 0 && completed.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              icon={<ClipboardList className="h-5 w-5" />}
              title="Nothing assigned yet"
              description="Accept an offer to start building your service history."
            />
          </div>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {[...active, ...completed].slice(0, 5).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/engineer/assignments/${t.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 transition-colors hover:bg-surface-alt"
                >
                  <span className="font-mono text-[12px] font-medium text-ink">{t.ref}</span>
                  <span className="text-[13px] text-ink-soft">{t.issue.category}</span>
                  <span className="text-[12px] text-ink-faint">{t.location.city}</span>
                  <span className="ml-auto flex items-center gap-2">
                    <span className="text-[11px] text-ink-faint">{relativeTime(t.updatedAt)}</span>
                    <StatusBadge status={t.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
