"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileCheck2,
  Plus,
  Timer,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { useStore, useMyOemId } from "@/lib/store";
import {
  cityDistribution,
  engineerStats,
  engineerLoadLabel,
  monthlyTrend,
  recentActivity,
  slaHealth,
  statusBreakdown,
  ticketKpis,
  visibleTickets,
} from "@/lib/selectors";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { Select } from "@/components/ui/form";
import { BarsChart, CHART_COLORS, ChartCard, DonutChart, ProgressBar, TrendChart } from "@/components/charts";
import { downloadCsv, formatDateTime, initials, relativeTime, todayIso } from "@/lib/utils";
import { OPEN_STATUSES } from "@/lib/constants";

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export function OemDashboard() {
  const { state, effectiveRole, effectiveRole: role } = useStore();
  const oemId = useMyOemId();
  const [range, setRange] = useState("30");

  const oem = state.oems.find((o) => o.id === oemId);
  const scope = visibleTickets(state, role, oemId);
  const tickets = useMemo(() => {
    const cutoff = new Date(todayIso()).getTime() - Number(range) * 86_400_000;
    return scope.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
  }, [scope, range]);

  const kpis = ticketKpis(tickets);
  const trend = monthlyTrend(scope);
  const statuses = statusBreakdown(tickets).map((s) => ({ name: s.label, value: s.count }));
  const cities = cityDistribution(tickets);
  const sla = slaHealth(tickets);
  const engineers = engineerStats(state)
    .filter((row) => !row.engineer.exclusiveOemId || row.engineer.exclusiveOemId === oemId)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const activity = recentActivity(state, 6);
  const critical = tickets
    .filter((t) => OPEN_STATUSES.includes(t.status) && (t.priority === "critical" || t.priority === "high"))
    .sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1))
    .slice(0, 5);
  const amc = state.amcContracts.filter((c) => c.oemId === oemId);
  const amcDue = state.maintenanceVisits.filter((v) =>
    amc.some((c) => c.id === v.amcId && (v.status === "maintenance_due" || v.status === "visit_planned")),
  );
  const awaitingReview = tickets.filter((t) => t.status === "awaiting_oem_review" || t.status === "report_submitted");

  const exportRows = () =>
    downloadCsv(
      `rayviq-tickets-${range}d`,
      tickets.map((t) => ({
        ref: t.ref,
        status: t.status,
        priority: t.priority,
        customer: t.contact.name,
        city: t.location.city,
        issue: t.issue.category,
        engineer: state.engineers.find((e) => e.id === t.assignedEngineerId)?.name ?? "Unassigned",
        created: t.createdAt,
        due: t.dueAt,
      })),
    );

  return (
    <div>
      <PageHeader
        title={`${oem?.shortName ?? "OEM"} service overview`}
        description="Live service coordination across your installed base — workload, SLA risk, field quality and AMC coverage in one view."
        actions={
          <>
            <Select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              options={RANGES}
              aria-label="Date range"
              className="w-36"
            />
            <Button variant="outline" onClick={exportRows}>
              <Download className="h-4 w-4" aria-hidden /> Export
            </Button>
            <Link href="/oem/tickets/new">
              <Button>
                <Plus className="h-4 w-4" aria-hidden /> New ticket
              </Button>
            </Link>
          </>
        }
      />

      {state.roleOverride && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-warning-100 bg-warning-50 px-4 py-2.5 text-[12px] text-warning-700">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Demo role preview: <span className="font-semibold">{role.replace(/_/g, " ")}</span>. Data scope and
          actions follow this role until you reset it from the top bar.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open tickets"
          value={kpis.open}
          hint={`${kpis.fresh} new · ${kpis.inProgress} field-active`}
          icon={<ClipboardList className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="SLA at risk / breached"
          value={kpis.overdue}
          hint={`${sla.find((s) => s.label.startsWith("At risk"))?.count ?? 0} at risk within 12h`}
          icon={<Timer className="h-4 w-4" />}
          tone={kpis.overdue > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Unassigned"
          value={kpis.unassigned}
          hint="Awaiting an engineer offer"
          icon={<Users className="h-4 w-4" />}
          tone={kpis.unassigned > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Awaiting OEM review"
          value={kpis.awaitingReview}
          hint="Service reports need a decision"
          icon={<FileCheck2 className="h-4 w-4" />}
          tone={kpis.awaitingReview > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Avg. response"
          value={`${kpis.avgResponseMins}m`}
          hint="Created → first assignment action"
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Avg. resolution"
          value={`${kpis.avgResolutionHours}h`}
          hint="Across completed & closed tickets"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Completed"
          value={kpis.completed}
          hint="Report approved and closed out"
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Active escalations"
          value={kpis.escalated}
          hint={`${state.escalations.filter((e) => e.status === "open").length} open platform-wide`}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={kpis.escalated > 0 ? "danger" : "success"}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Ticket volume"
          description="Created vs completed over the last six months"
          className="xl:col-span-2"
          action={
            <Badge tone="blue">
              <ArrowUpRight className="h-3 w-3" aria-hidden /> {trend.reduce((a, b) => a + b.created, 0)} created
            </Badge>
          }
        >
          <TrendChart
            data={trend}
            series={[
              { key: "created", color: CHART_COLORS[0], name: "Created" },
              { key: "completed", color: CHART_COLORS[4], name: "Completed" },
            ]}
          />
        </ChartCard>

        <ChartCard title="Status mix" description="Every ticket in the selected range">
          <DonutChart data={statuses} innerLabel="tickets" />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="SLA health" description="Open tickets against resolution targets" />
          <div className="space-y-4">
            {sla.map((s) => {
              const total = Math.max(1, sla.reduce((a, b) => a + b.count, 0));
              return (
                <div key={s.label}>
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span className="font-medium text-ink-soft">{s.label}</span>
                    <span className="font-semibold text-ink">{s.count}</span>
                  </div>
                  <ProgressBar
                    value={s.count}
                    max={total}
                    tone={s.tone === "green" ? "success" : s.tone === "amber" ? "warning" : "danger"}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-lg bg-surface-alt px-3 py-2.5 text-[11px] leading-5 text-ink-muted">
            SLA targets come from platform settings. Breached tickets always require an OEM decision before closure.
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Needs attention"
            description="Critical and high priority tickets closest to their resolution deadline"
            action={
              <Link href="/oem/tickets?priority=critical" className="text-[12px] font-medium text-brand-700">
                View all
              </Link>
            }
          />
          {critical.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-muted">No critical tickets in this range.</p>
          ) : (
            <ul className="divide-y divide-line">
              {critical.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/oem/tickets/${t.id}`}
                    className="flex flex-wrap items-center gap-2.5 py-3 transition-colors hover:bg-surface-alt/60"
                  >
                    <span className="w-28 shrink-0 font-mono text-[12px] font-medium text-ink">{t.ref}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{t.issue.category}</span>
                      <span className="block truncate text-[11px] text-ink-muted">
                        {t.contact.name} · {t.location.city} · {t.location.state}
                      </span>
                    </span>
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                    <span className="w-24 text-right text-[11px] text-ink-muted">{relativeTime(t.dueAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard title="Location distribution" description="Tickets by city" className="xl:col-span-1">
          <BarsChart data={cities} dataKey="city" horizontal />
        </ChartCard>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Engineer performance"
            description="Top verified engineers by composite service score"
            action={
              <Link href="/oem/engineers" className="text-[12px] font-medium text-brand-700">
                Engineer network
              </Link>
            }
          />
          <Table>
            <THead columns={[{ label: "Engineer" }, { label: "Load" }, { label: "Open" }, { label: "Done" }, { label: "Rating" }, { label: "Score" }]} />
            <TBody>
              {engineers.map(({ engineer, openTickets, completedTickets, score }) => {
                const load = engineerLoadLabel(engineer);
                return (
                  <Tr key={engineer.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand-700">
                          {initials(engineer.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-ink">{engineer.name}</p>
                          <p className="truncate text-[11px] text-ink-faint">
                            {engineer.city} · {engineer.experienceYears}y
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={load.tone === "green" ? "green" : load.tone === "amber" ? "amber" : "red"}>
                        {load.label}
                      </Badge>
                    </Td>
                    <Td>{openTickets}</Td>
                    <Td>{completedTickets}</Td>
                    <Td>{engineer.rating.toFixed(1)}</Td>
                    <Td>
                      <span className="font-semibold text-ink">{score}</span>
                      <span className="text-ink-faint">/100</span>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="AMC & preventive maintenance"
            description={`${amc.filter((c) => c.status === "active").length} active contracts · ${amcDue.length} visits due`}
            action={
              <Link href="/amc" className="text-[12px] font-medium text-brand-700">
                Open AMC
              </Link>
            }
          />
          <div className="space-y-2.5">
            {amc.slice(0, 4).map((c) => {
              const site = state.sites.find((s) => s.id === c.siteId);
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-100 text-accent-600">
                    <CalendarClock className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{c.planName}</p>
                    <p className="truncate text-[11px] text-ink-muted">
                      {site?.name ?? c.ref} · ends {c.endsOn}
                    </p>
                  </div>
                  <Badge tone={c.status === "active" ? "green" : c.status === "expiring" ? "amber" : "gray"}>
                    {c.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              );
            })}
            {amc.length === 0 && <p className="py-6 text-center text-[13px] text-ink-muted">No AMC contracts yet.</p>}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent activity"
            description="Latest lifecycle events across your tickets"
            action={
              <Link href="/oem/reports" className="text-[12px] font-medium text-brand-700">
                Reports
              </Link>
            }
          />
          <ul className="space-y-3">
            {activity.map((a, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-ink">
                    {a.ref ? `${a.ref} · ` : ""}
                    {a.title}
                  </p>
                  <p className="truncate text-[11px] text-ink-muted">{a.detail ?? "No extra detail"}</p>
                </div>
                <span className="shrink-0 text-[10px] text-ink-faint">{relativeTime(a.at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Pending OEM approvals"
            description="Reports fully inside your decision boundary"
            action={
              <Link href="/oem/reports?status=awaiting_oem_review" className="text-[12px] font-medium text-brand-700">
                Review queue
              </Link>
            }
          />
          {awaitingReview.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-muted">Nothing waiting on you right now.</p>
          ) : (
            <ul className="divide-y divide-line">
              {awaitingReview.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-center gap-2 py-2.5">
                  <span className="font-mono text-[12px] text-ink">{t.ref}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-ink-muted">{t.issue.category}</span>
                  <Link href={`/oem/reports/${t.reportId ?? t.id}`} className="text-[12px] font-medium text-brand-700">
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Service coverage" description="Engineers verified for your products" />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-alt p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">Approved</p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {state.engineers.filter((e) => e.verification === "approved").length}
              </p>
            </div>
            <div className="rounded-lg bg-surface-alt p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">Available now</p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {state.engineers.filter((e) => e.availability === "available" && e.verification === "approved").length}
              </p>
            </div>
            <div className="rounded-lg bg-surface-alt p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">Cities covered</p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {new Set(state.engineers.map((e) => e.city)).size}
              </p>
            </div>
            <div className="rounded-lg bg-surface-alt p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">Avg. rating</p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {(state.engineers.reduce((a, e) => a + e.rating, 0) / Math.max(1, state.engineers.length)).toFixed(1)}
              </p>
            </div>
          </div>
          <Link href="/oem/engineers" className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-brand-700">
            Browse network <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Card>
      </div>

      <p className="mt-5 text-[11px] text-ink-faint">
        Last refreshed {formatDateTime(new Date().toISOString())} · {effectiveRole.replace(/_/g, " ")} view · Data is
        simulated for demonstration.
      </p>
    </div>
  );
}

export function EngineerDashboard() {
  const { state, currentUser, respondToOffer, toast } = useStore();
  const engineerIds =
    currentUser?.role === "engineer"
      ? [currentUser.engineerId ?? "ENG-01"]
      : state.engineers
          .filter((e) => e.partnerId === currentUser?.partnerId)
          .map((e) => e.id);
  const engineer = state.engineers.find((e) => engineerIds.includes(e.id)) ?? state.engineers[0]!;

  const offers = state.assignments
    .filter((a) => a.state === "pending_offer" && engineerIds.includes(a.engineerId))
    .map((a) => ({ assignment: a, ticket: state.tickets.find((t) => t.id === a.ticketId) }))
    .filter((x) => x.ticket);

  const myTickets = state.tickets.filter(
    (t) => t.assignedEngineerId && engineerIds.includes(t.assignedEngineerId),
  );
  const open = myTickets.filter((t) => OPEN_STATUSES.includes(t.status));
  const visits = state.visits.filter((v) => engineerIds.includes(v.engineerId));
  const upcoming = visits
    .filter((v) => v.status === "scheduled" || v.status === "in_progress")
    .sort((a, b) => (a.scheduledFor < b.scheduledFor ? -1 : 1));
  const today = new Date().toISOString().slice(0, 10);
  const todayVisits = visits.filter((v) => v.scheduledFor.slice(0, 10) === today);
  const awaitingClarification = myTickets.filter((t) => t.status === "clarification_required");
  const completed = myTickets.filter((t) => t.status === "completed" || t.status === "closed");

  return (
    <div>
      <PageHeader
        title={`Good day, ${engineer.name.split(" ")[0]}`}
        description="Your available offers, scheduled visits and service quality at a glance. Respond to offers before the deadline to keep your acceptance rate healthy."
        actions={
          <Link href="/engineer/requests">
            <Button>
              <Wrench className="h-4 w-4" aria-hidden /> Find requests
            </Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="New offers"
          value={offers.length}
          hint="Respond before the deadline"
          icon={<Wrench className="h-4 w-4" />}
          tone={offers.length > 0 ? "brand" : "default"}
        />
        <StatCard
          label="Visits today"
          value={todayVisits.length}
          hint={`${upcoming.length} upcoming in total`}
          icon={<CalendarClock className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Open assignments"
          value={open.length}
          hint={`${completed.length} completed lifetime`}
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <StatCard
          label="Rating"
          value={`${engineer.rating.toFixed(1)}/5`}
          hint={`${engineer.completedJobs} jobs · ${engineer.acceptanceRate}% accepted`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Available requests"
            description="Offers matched to your skills, location and current workload"
            action={
              <Link href="/engineer/requests" className="text-[12px] font-medium text-brand-700">
                View all
              </Link>
            }
          />
          {offers.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-muted">
              No open offers. New requests will appear here and in your notifications.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {offers.slice(0, 4).map(({ assignment, ticket }) => (
                <li key={assignment.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[12px] font-medium text-ink">{ticket!.ref}</span>
                    <PriorityBadge priority={ticket!.priority} />
                    <StatusBadge status={ticket!.status} />
                    <span className="ml-auto text-[11px] text-ink-muted">
                      Respond {relativeTime(assignment.responseDeadline)}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] font-medium text-ink">{ticket!.issue.category}</p>
                  <p className="text-[11px] text-ink-muted">
                    {ticket!.contact.name} · {ticket!.location.city}, {ticket!.location.state} ·{" "}
                    {ticket!.product.model}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => respondToOffer(ticket!.id, true)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        respondToOffer(ticket!.id, false, "Outside current availability");
                        toast("Offer declined", { tone: "info" });
                      }}
                    >
                      Decline
                    </Button>
                    <Link href={`/engineer/requests/${ticket!.id}`}>
                      <Button size="sm" variant="ghost">
                        Details
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Upcoming visits"
            description="Your next scheduled site visits"
            action={
              <Link href="/engineer/visits" className="text-[12px] font-medium text-brand-700">
                All visits
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-muted">No visits scheduled.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.slice(0, 4).map((v) => {
                const t = state.tickets.find((x) => x.id === v.ticketId);
                return (
                  <li key={v.id} className="rounded-lg border border-line px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-ink-muted">{t?.ref}</span>
                      <Badge tone={v.status === "in_progress" ? "blue" : "cyan"}>{v.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="mt-1 truncate text-[13px] font-medium text-ink">{t?.location.city}</p>
                    <p className="text-[11px] text-ink-muted">
                      {formatDateTime(v.scheduledFor)} · {v.slot}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard title="My workload" description="Tickets by current status" className="xl:col-span-2">
          <DonutChart
            data={statusBreakdown(myTickets).map((s) => ({ name: s.label, value: s.count }))}
            innerLabel="tickets"
          />
        </ChartCard>

        <Card>
          <CardHeader title="Service quality" description="Rolling performance indicators" />
          <div className="space-y-4">
            {[
              { label: "Acceptance rate", value: engineer.acceptanceRate, tone: "success" as const },
              { label: "Report quality", value: engineer.reportQualityScore, tone: "brand" as const },
              { label: "On-time response", value: Math.max(0, 100 - engineer.avgResponseMins / 6), tone: "warning" as const },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="text-ink-soft">{row.label}</span>
                  <span className="font-semibold text-ink">{Math.round(row.value)}%</span>
                </div>
                <ProgressBar value={row.value} tone={row.tone} />
              </div>
            ))}
          </div>
          {awaitingClarification.length > 0 && (
            <div className="mt-4 rounded-lg border border-warning-100 bg-warning-50 px-3 py-2.5 text-[12px] text-warning-700">
              {awaitingClarification.length} report{awaitingClarification.length > 1 ? "s" : ""} need clarification
              from you.
            </div>
          )}
          <Link
            href="/engineer/profile"
            className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-brand-700"
          >
            View performance profile <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="My open assignments" description="Accepted work in progress" />
          {open.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-muted">Nothing open — nice work.</p>
          ) : (
            <ul className="divide-y divide-line">
              {open.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center gap-2 py-2.5">
                  <span className="font-mono text-[12px] text-ink">{t.ref}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-ink-muted">{t.issue.category}</span>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="This week" description="Field activity summary" />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-alt p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">Visits</p>
              <p className="mt-1 text-xl font-semibold text-ink">{todayVisits.length}</p>
            </div>
            <div className="rounded-lg bg-surface-alt p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">Reports due</p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {myTickets.filter((t) => t.status === "in_progress" || t.status === "visit_scheduled").length}
              </p>
            </div>
            <div className="rounded-lg bg-surface-alt p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">Completed</p>
              <p className="mt-1 text-xl font-semibold text-ink">{completed.length}</p>
            </div>
            <div className="rounded-lg bg-surface-alt p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">Load</p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {engineer.currentLoad}/{engineer.maxLoad}
              </p>
            </div>
          </div>
          <Link
            href="/engineer/reports"
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-brand-700"
          >
            Submit a service report <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Card>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const { state, effectiveRole: role } = useStore();
  const tickets = visibleTickets(state, role, null);
  const kpis = ticketKpis(tickets);
  const trend = monthlyTrend(tickets);
  const sla = slaHealth(tickets);
  const escalations = state.escalations.filter((e) => e.status === "open");
  const pendingVerification = state.engineers.filter((e) => e.verification !== "approved");
  const audit = state.auditLogs.slice(0, 7);

  return (
    <div>
      <PageHeader
        title="Platform operations"
        description="Network health, assignment coverage, verification backlog and commercial posture across every OEM workspace."
        actions={
          <>
            <Link href="/admin/operations">
              <Button variant="outline">
                <ClipboardList className="h-4 w-4" aria-hidden /> Operations
              </Button>
            </Link>
            <Link href="/admin/oems">
              <Button>
                <Plus className="h-4 w-4" aria-hidden /> Add OEM
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="OEM organisations" value={state.oems.length} hint={`${state.oems.filter((o) => o.status === "active").length} active workspaces`} icon={<Users className="h-4 w-4" />} tone="brand" />
        <StatCard label="Engineer network" value={state.engineers.length} hint={`${pendingVerification.length} pending verification`} icon={<Wrench className="h-4 w-4" />} />
        <StatCard label="Open tickets" value={kpis.open} hint={`${kpis.overdue} beyond SLA`} icon={<ClipboardList className="h-4 w-4" />} tone={kpis.overdue > 0 ? "warning" : "success"} />
        <StatCard label="Open escalations" value={escalations.length} hint="Across all levels" icon={<AlertTriangle className="h-4 w-4" />} tone={escalations.length > 0 ? "danger" : "success"} />
        <StatCard label="Unassigned" value={kpis.unassigned} hint="Requires ops intervention" icon={<Users className="h-4 w-4" />} tone={kpis.unassigned > 0 ? "warning" : "success"} />
        <StatCard label="Awaiting OEM review" value={kpis.awaitingReview} hint="Reports sitting with OEMs" icon={<FileCheck2 className="h-4 w-4" />} />
        <StatCard label="Avg. resolution" value={`${kpis.avgResolutionHours}h`} hint="Platform-wide completed work" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Cities covered" value={new Set(state.engineers.map((e) => e.city)).size} hint={`${state.engineers.filter((e) => e.availability === "available").length} engineers available`} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <ChartCard title="Platform ticket flow" description="Created vs completed, last six months" className="xl:col-span-2">
          <TrendChart
            data={trend}
            series={[
              { key: "created", color: CHART_COLORS[0], name: "Created" },
              { key: "completed", color: CHART_COLORS[4], name: "Completed" },
            ]}
          />
        </ChartCard>
        <ChartCard title="SLA posture" description="Open tickets by resolution risk">
          <DonutChart data={sla.map((s) => ({ name: s.label, value: s.count }))} innerLabel="open" />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="OEM workspaces"
            description="Subscription status, service load and go-live posture"
            action={
              <Link href="/admin/oems" className="text-[12px] font-medium text-brand-700">
                Manage OEMs
              </Link>
            }
          />
          <Table>
            <THead columns={[{ label: "OEM" }, { label: "Plan" }, { label: "Open tickets" }, { label: "Subscription" }, { label: "Status" }]} />
            <TBody>
              {state.oems.map((oem) => {
                const open = tickets.filter((t) => t.oemId === oem.id && OPEN_STATUSES.includes(t.status)).length;
                return (
                  <Tr key={oem.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                          style={{ backgroundColor: oem.logoColor }}
                        >
                          {oem.shortName.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="text-[13px] font-medium text-ink">{oem.shortName}</p>
                          <p className="text-[11px] text-ink-faint">{oem.hqCity}, {oem.hqState}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>{state.plans.find((p) => p.id === oem.planId)?.name ?? "—"}</Td>
                    <Td>{open}</Td>
                    <Td>
                      <Badge tone={oem.subscriptionStatus === "active" ? "green" : oem.subscriptionStatus === "trial" ? "blue" : "amber"}>
                        {oem.subscriptionStatus.replace(/_/g, " ")}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge tone={oem.status === "active" ? "green" : "gray"}>{oem.status}</Badge>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </Card>

        <Card>
          <CardHeader
            title="Verification queue"
            description="Engineer onboarding awaiting a platform decision"
            action={
              <Link href="/admin/engineers" className="text-[12px] font-medium text-brand-700">
                Review
              </Link>
            }
          />
          {pendingVerification.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-muted">No pending verifications.</p>
          ) : (
            <ul className="divide-y divide-line">
              {pendingVerification.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-center gap-2 py-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-warning-50 text-[10px] font-semibold text-warning-700">
                    {initials(e.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-ink">{e.name}</p>
                    <p className="truncate text-[11px] text-ink-faint">{e.city} · {e.experienceYears}y exp</p>
                  </div>
                  <Badge tone="amber">{e.verification.replace(/_/g, " ")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Open escalations"
            description="Cross-party blockers needing coordination"
            action={
              <Link href="/admin/operations" className="text-[12px] font-medium text-brand-700">
                Operations
              </Link>
            }
          />
          {escalations.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-muted">No open escalations.</p>
          ) : (
            <ul className="divide-y divide-line">
              {escalations.slice(0, 5).map((e) => {
                const t = state.tickets.find((x) => x.id === e.ticketId);
                return (
                  <li key={e.id} className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Badge tone={e.level >= 2 ? "red" : "amber"}>Level {e.level}</Badge>
                      <span className="font-mono text-[11px] text-ink">{t?.ref}</span>
                      <span className="ml-auto text-[10px] text-ink-faint">{relativeTime(e.raisedAt)}</span>
                    </div>
                    <p className="mt-1 truncate text-[12px] text-ink-muted">{e.reason}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent audit trail"
            description="Immutable record of platform actions"
            action={
              <Link href="/admin/audit" className="text-[12px] font-medium text-brand-700">
                Audit logs
              </Link>
            }
          />
          <ul className="space-y-3">
            {audit.map((a) => (
              <li key={a.id} className="flex items-start gap-2.5">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    a.severity === "critical" ? "bg-danger-500" : a.severity === "warning" ? "bg-warning-500" : "bg-brand-400"
                  }`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-ink">{a.action} · {a.target}</p>
                  <p className="truncate text-[11px] text-ink-faint">{a.actor} · {relativeTime(a.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
