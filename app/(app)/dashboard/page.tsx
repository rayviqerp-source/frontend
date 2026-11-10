"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  FileCheck2,
  Gauge,
  Heart,
  MapPin,
  Sparkles,
  Star,
  Ticket,
  Timer,
  TrendingUp,
  UserCheck,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import { useStore, useMyOemId } from "@/lib/store";
import { ROLE_LABELS, ROLE_PORTAL } from "@/lib/constants";
import { can } from "@/lib/permissions";
import { inverterArtFor } from "@/lib/inverter-art";
import { InverterBackdrop } from "@/components/ui/inverter-backdrop";
import { PersonAvatar } from "@/components/marketplace/person-avatar";
import { EngineerHome } from "@/components/dashboard/engineer-home";
import {
  recentActivity,
  slaHealth,
  statusBreakdown,
  ticketKpis,
  visibleTickets,
} from "@/lib/selectors";
import { relativeTime } from "@/lib/utils";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { ChartCard, DonutChart, TrendChart } from "@/components/charts";
import { TBody, Td, THead, Table, Tr } from "@/components/ui/table";

const AVATAR_COLORS = [
  "#2554e0",
  "#0e7c66",
  "#b45309",
  "#7c3aed",
  "#be123c",
  "#0369a1",
  "#a16207",
];

function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

export default function DashboardPage() {
  const router = useRouter();
  const { state, effectiveRole, currentUser, toast } = useStore();
  const oemId = useMyOemId();
  const portal = ROLE_PORTAL[effectiveRole];

  const tickets = useMemo(
    () => visibleTickets(state, effectiveRole, oemId),
    [state, effectiveRole, oemId],
  );
  const kpis = useMemo(() => ticketKpis(tickets), [tickets]);
  const sla = useMemo(() => slaHealth(tickets), [tickets]);
  const breakdown = useMemo(() => statusBreakdown(tickets), [tickets]);
  const activity = useMemo(() => recentActivity(state, 7), [state]);

  const myVisits = state.visits.filter((v) => v.status === "scheduled");
  const myEngineerId = currentUser?.engineerId;
  const myAssignments = state.assignments.filter(
    (a) =>
      a.state === "pending_offer" &&
      (!myEngineerId || a.engineerId === myEngineerId),
  );

  const roleGreeting =
    portal === "oem"
      ? "Coordinate field service across your installed base"
      : portal === "engineer"
        ? "Your assignments, visits and reports at a glance"
        : "Platform health across OEMs, engineers and operations";

  const trendData = useMemo(() => {
    const now = new Date();
    const out: { month: string; created: number; resolved: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("en-US", { month: "short" });
      const inMonth = (iso?: string) => {
        if (!iso) return false;
        const x = new Date(iso);
        return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth();
      };
      out.push({
        month: label,
        created: tickets.filter((t) => inMonth(t.createdAt)).length,
        resolved: tickets.filter(
          (t) => (t.status === "completed" || t.status === "closed") && inMonth(t.closedAt ?? t.updatedAt),
        ).length,
      });
    }
    return out;
  }, [tickets]);

  const kpiCards = [
    {
      label: "Open tickets",
      value: kpis.open,
      icon: <Ticket className="h-4 w-4" />,
      hint: `${kpis.fresh} new awaiting triage`,
      tone: "brand" as const,
    },
    {
      label: "Overdue vs SLA",
      value: kpis.overdue,
      icon: <AlertTriangle className="h-4 w-4" />,
      hint: kpis.overdue ? "Needs attention today" : "All within target",
      tone: (kpis.overdue ? "danger" : "success") as "danger" | "success",
    },
    {
      label: "Unassigned",
      value: kpis.unassigned,
      icon: <UserCheck className="h-4 w-4" />,
      hint: kpis.unassigned ? "Assignment queue active" : "Queue is clear",
      tone: (kpis.unassigned ? "warning" : "default") as "warning" | "default",
    },
    {
      label: "Awaiting report review",
      value: kpis.awaitingReview,
      icon: <FileCheck2 className="h-4 w-4" />,
      hint: `${kpis.completed} completed all-time`,
      tone: "default" as const,
    },
  ];

  const actions: React.ReactNode[] = [];
  if (can(effectiveRole, "oem.tickets.create")) {
    actions.push(
      <Link key="new" href="/oem/tickets/new">
        <Button>
          <CircleDot className="h-4 w-4" /> New ticket
        </Button>
      </Link>,
    );
  }
  if (portal === "engineer") {
    actions.push(
      <Link key="req" href="/engineer/requests">
        <Button>
          <Sparkles className="h-4 w-4" /> Available requests
        </Button>
      </Link>,
    );
  }
  if (portal === "admin") {
    actions.push(
      <Link key="ops" href="/admin/operations">
        <Button>
          <Gauge className="h-4 w-4" /> Assignment ops
        </Button>
      </Link>,
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`Welcome back, ${currentUser?.name.split(" ")[0] ?? "there"}`}
        description={`${ROLE_LABELS[effectiveRole]} · ${roleGreeting}.`}
        actions={actions}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpiCards.map((k) => (
          <StatCard key={k.label} {...k} />
        ))}
      </div>

      {/* Second row: role-specific stats */}
      <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Avg first response"
          value={kpis.avgResponseMins < 60 ? `${kpis.avgResponseMins}m` : `${Math.round(kpis.avgResponseMins / 60)}h`}
          hint="Target: within SLA window"
          icon={<Timer className="h-4 w-4" />}
        />
        <StatCard
          label="Avg resolution time"
          value={`${kpis.avgResolutionHours}h`}
          hint="Completed tickets"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Visits scheduled"
          value={myVisits.length}
          hint="Upcoming field visits"
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <StatCard
          label={portal === "engineer" ? "Offers awaiting you" : "Escalated tickets"}
          value={portal === "engineer" ? myAssignments.length : kpis.escalated}
          hint={
            portal === "engineer"
              ? "Respond before the deadline"
              : "Open escalations to resolve"
          }
          icon={portal === "engineer" ? <Wrench className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          tone={portal === "engineer" ? "warning" : kpis.escalated ? "danger" : "success"}
        />
      </div>

      {/* Available experts — OEM / admin only. An engineer must never see the
          whole network (nor another engineer's card) from their own dashboard. */}
      {portal !== "engineer" && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-ink">
                Available experts
              </h2>
              <p className="text-xs text-ink-muted">
                Browse verified technicians and book repairs
              </p>
            </div>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:text-brand-700"
            >
              Browse all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="grid gap-3 sm:gap-5 lg:grid-cols-3">
            {state.engineers
              .filter((e) => e.status === "active" && e.verification === "approved")
              .slice(0, 6)
              .map((e) => (
                <li key={e.id}>
                  <Link
                    href={
                      portal === "admin"
                        ? `/admin/engineers/${e.id}`
                        : `/oem/engineers/${e.id}`
                    }
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-pop"
                  >
                  {/* photo banner */}
                  <div
                    className="relative h-28 shrink-0 overflow-hidden"
                    style={{ backgroundColor: avatarColor(e.name) }}
                  >
                    <InverterBackdrop src={inverterArtFor(e)} />
                    <span className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/25" aria-hidden />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <PersonAvatar
                        id={e.id}
                        name={e.name}
                        backgroundColor={avatarColor(e.name)}
                        className="h-16 w-16 rounded-2xl text-lg ring-2 ring-white/80 shadow-pop transition-transform duration-200 group-hover:scale-105 sm:h-20 sm:w-20 sm:text-xl"
                      />
                    </span>
                    <span
                      className={`absolute left-2.5 top-2.5 rounded-md px-2 py-1 text-[9.5px] font-bold uppercase tracking-widest shadow-card sm:left-3 sm:top-3 ${
                        e.verification === "approved" ? "bg-white/95 text-ink" : "bg-warning-50/95 text-warning-700"
                      }`}
                    >
                      {e.verification === "approved" ? "Verified" : "In review"}
                    </span>
                    <button
                      type="button"
                      aria-label={`Save ${e.name}`}
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        toast(`Saved ${e.name}`, { tone: "info" });
                      }}
                      className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-card transition-transform hover:scale-105 active:scale-95 sm:right-3 sm:top-3"
                    >
                      <Heart className="h-4 w-4 text-ink-faint" aria-hidden />
                    </button>
                    <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur sm:bottom-3 sm:left-3">
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

                  {/* body */}
                  <div className="flex flex-1 flex-col p-3 sm:p-4">
                    <p className="truncate text-[14px] font-semibold tracking-tight text-ink sm:text-[15px]">
                      {e.name}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[12.5px]">
                      <span className="flex min-w-0 items-center gap-1 text-ink-muted">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
                        <span className="truncate">{e.city}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 font-semibold text-ink">
                        {e.rating > 0 ? e.rating.toFixed(1) : "New"}
                        <Star className="h-3.5 w-3.5 fill-warning-400 text-warning-400" aria-hidden />
                      </span>
                    </div>
                    <div className="mt-auto">
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5 text-[12.5px]">
                        <span className="font-bold text-ink">{e.completedJobs} jobs</span>
                        <span className="text-ink-faint">/ {e.experienceYears} yrs</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {state.engineers.filter((e) => e.status === "active" && e.verification === "approved").length === 0 && (
            <EmptyState
              icon={<UserRound className="h-5 w-5" />}
              title="No experts available"
              description="All engineers are unverified or offline."
              className="mt-3"
            />
          )}
        </div>
      )}

      {/* Engineer portal — your own work, not the whole network */}
      {portal === "engineer" && <EngineerHome />}

      {/* Charts */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Ticket volume"
          description="Created vs resolved over the last 6 months"
          action={
            can(effectiveRole, "oem.analytics.view") || portal === "admin" ? (
              <Link
                href={portal === "admin" ? "/admin/operations" : "/oem/analytics"}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:text-brand-700"
              >
                View analytics <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            ) : undefined
          }
        >
          <TrendChart
            data={trendData}
            series={[
              { key: "created", name: "Created", color: "#2554e0" },
              { key: "resolved", name: "Resolved", color: "#10b981" },
            ]}
            height={240}
          />
        </ChartCard>

        <Card>
          <CardHeader
            title="SLA health"
            description="Open tickets vs resolution target"
          />
          <div className="space-y-3">
            {sla.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between rounded-lg border border-line bg-surface-alt/60 px-3.5 py-3"
              >
                <span className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      s.tone === "green"
                        ? "bg-success-500"
                        : s.tone === "amber"
                          ? "bg-warning-500"
                          : "bg-danger-500"
                    }`}
                  />
                  {s.label}
                </span>
                <span className="text-lg font-semibold text-ink">{s.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-xs leading-5 text-ink-faint">
              SLA targets are configured in platform settings and applied at ticket
              creation. Breach detection runs client-side in this demo.
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Status distribution" description={`${tickets.length} tickets in scope`} />
          <DonutChart
            data={breakdown.map((b) => ({ name: b.label, value: b.count }))}
            height={252}
            innerLabel="Total"
          />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent activity"
            description="Latest timeline events across your workspace"
            action={
              can(effectiveRole, "admin.audit.view") ? (
                <Link
                  href="/admin/audit"
                  className="text-[13px] font-medium text-brand-600 hover:text-brand-700"
                >
                  Audit logs
                </Link>
              ) : undefined
            }
          />
          <ul className="space-y-3">
            {activity.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-ink">
                    {a.title}
                    {a.ref && (
                      <Link
                        href={`${portal === "engineer" ? "/engineer/assignments" : portal === "admin" ? "/admin/tickets" : "/oem/tickets"}/${state.tickets.find((t) => t.ref === a.ref)?.id ?? ""}`}
                        className="font-mono text-xs text-brand-600 hover:underline"
                      >
                        {a.ref}
                      </Link>
                    )}
                  </p>
                  {a.detail && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{a.detail}</p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-ink-faint">{relativeTime(a.at)}</span>
              </li>
            ))}
            {activity.length === 0 && (
              <li>
                <EmptyState title="No activity yet" description="Timeline events will appear here." />
              </li>
            )}
          </ul>
        </Card>
      </div>

      {/* Quick links / open tickets */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" padded={false}>
          <div className="px-5 pt-5">
            <CardHeader
              title="Priority queue"
              description="Open tickets sorted by urgency"
              action={
                can(effectiveRole, "oem.tickets.view") || portal === "admin" ? (
                  <Link
                    href={portal === "admin" ? "/admin/tickets" : "/oem/tickets"}
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:text-brand-700"
                  >
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : undefined
              }
            />
          </div>
          <Table>
            <THead
              columns={[
                { label: "Ticket" },
                { label: "Priority" },
                { label: "Status" },
                { label: "City" },
                { label: "Due" },
              ]}
            />
            <TBody>
              {tickets
                .filter((t) => t.status !== "closed")
                .slice()
                .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
                .slice(0, 6)
                .map((t) => (
                  <Tr
                    key={t.id}
                    onClick={() =>
                      router.push(
                        `${portal === "engineer" ? "/engineer/assignments" : portal === "admin" ? "/admin/tickets" : "/oem/tickets"}/${t.id}`,
                      )
                    }
                  >
                    <Td>
                      <span className="block font-mono text-xs font-medium text-brand-700">{t.ref}</span>
                      <span className="block truncate text-xs text-ink-muted">{t.issue.category}</span>
                    </Td>
                    <Td>
                      <PriorityBadge priority={t.priority} />
                    </Td>
                    <Td>
                      <StatusBadge status={t.status} />
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3 text-ink-faint" /> {t.location.city}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-xs">
                      {new Date(t.dueAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </Td>
                  </Tr>
                ))}
            </TBody>
          </Table>
          {tickets.filter((t) => t.status !== "closed").length === 0 && (
            <div className="p-5">
              <EmptyState
                icon={<CheckCircle2 className="h-5 w-5" />}
                title="Inbox zero"
                description="No open tickets right now."
              />
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Quick links" />
            <div className="space-y-2">
              {[
                { href: "/assistant", label: "Ask the AI service assistant", icon: Sparkles },
                { href: "/notifications", label: "Notification centre", icon: ClipboardList },
                ...(can(effectiveRole, "oem.reports.review")
                  ? [{ href: "/oem/reports", label: "Reports awaiting review", icon: FileCheck2 }]
                  : []),
                ...(portal === "engineer"
                  ? [{ href: "/engineer/visits", label: "My upcoming visits", icon: CalendarClock }]
                  : []),
                ...(portal === "admin"
                  ? [{ href: "/admin/engineers", label: "Engineer verification queue", icon: Users }]
                  : []),
                { href: "/amc", label: "AMC contracts & maintenance", icon: ClipboardList },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-alt/50 px-3.5 py-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:border-brand-300 hover:bg-brand-50/50 hover:text-ink"
                >
                  <span className="inline-flex items-center gap-2">
                    <l.icon className="h-3.5 w-3.5 text-ink-faint" /> {l.label}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-ink-faint" />
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Environment" />
            <div className="space-y-2 text-[13px] text-ink-muted">
              <div className="flex items-center justify-between">
                <span>Data source</span>
                <Badge tone="cyan">Mock seed data</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Persistence</span>
                <Badge tone="gray">Browser localStorage</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Backend API</span>
                <Badge tone="amber">Not connected</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
