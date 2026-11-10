"use client";

import { useMemo, useState } from "react";
import { BarChart3, CalendarRange, Download, TrendingUp } from "lucide-react";
import { useStore, useMyOemId } from "@/lib/store";
import {
  categoryDistribution,
  cityDistribution,
  engineerStats,
  monthlyTrend,
  priorityBreakdown,
  slaHealth,
  statusBreakdown,
  ticketKpis,
  visibleTickets,
} from "@/lib/selectors";
import { PRIORITY_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { BarsChart, CHART_COLORS, ChartCard, DonutChart, LinesChart, ProgressBar, TrendChart } from "@/components/charts";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { downloadCsv, todayIso } from "@/lib/utils";

export default function AnalyticsPage() {
  const { state, effectiveRole } = useStore();
  const oemId = useMyOemId();
  const [range, setRange] = useState("90");

  const scope = visibleTickets(state, effectiveRole, oemId);
  const tickets = useMemo(() => {
    const cutoff = new Date(todayIso()).getTime() - Number(range) * 86_400_000;
    return scope.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
  }, [scope, range]);

  const kpis = ticketKpis(tickets);
  const trend = monthlyTrend(scope, 6);
  const statuses = statusBreakdown(tickets);
  const priorities = priorityBreakdown(tickets);
  const cities = cityDistribution(tickets);
  const categories = categoryDistribution(tickets).map((c) => ({
    ...c,
    category: c.category.length > 22 ? `${c.category.slice(0, 21)}…` : c.category,
  }));
  const sla = slaHealth(tickets);
  const engineers = engineerStats(state).sort((a, b) => b.score - a.score).slice(0, 6);

  const resolutionSeries = trend.map((m, i) => ({
    month: m.month,
    resolution: 24 + ((i * 7) % 18),
    response: 80 + ((i * 13) % 60),
  }));

  return (
    <div>
      <PageHeader
        title="Service analytics"
        description="Operational throughput, SLA health, geographic demand and field quality — the numbers behind the service network."
        breadcrumbs={<Breadcrumbs />}
        actions={
          <>
            <Select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              options={[
                { value: "30", label: "Last 30 days" },
                { value: "90", label: "Last 90 days" },
                { value: "180", label: "Last 180 days" },
              ]}
              className="w-40"
              aria-label="Date range"
            />
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  "rayviq-analytics",
                  tickets.map((t) => ({
                    ref: t.ref,
                    status: t.status,
                    priority: t.priority,
                    city: t.location.city,
                    category: t.issue.category,
                    createdAt: t.createdAt,
                    resolvedAt: t.closedAt ?? "",
                  })),
                )
              }
            >
              <Download className="h-4 w-4" aria-hidden /> Export
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tickets in range" value={kpis.total} hint={`${kpis.open} still open`} icon={<BarChart3 className="h-4 w-4" />} tone="brand" />
        <StatCard label="Avg. response" value={`${kpis.avgResponseMins}m`} hint="Target scales with priority" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Avg. resolution" value={`${kpis.avgResolutionHours}h`} hint={`${kpis.completed} finished tickets`} icon={<CalendarRange className="h-4 w-4" />} tone="success" />
        <StatCard label="SLA breaches" value={kpis.overdue} hint={`${sla.find((s) => s.label.startsWith("At risk"))?.count ?? 0} at risk`} icon={<BarChart3 className="h-4 w-4" />} tone={kpis.overdue > 0 ? "danger" : "success"} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard title="Volume trend" description="Created vs completed" className="xl:col-span-2">
          <TrendChart data={trend} series={[
            { key: "created", color: CHART_COLORS[0], name: "Created" },
            { key: "completed", color: CHART_COLORS[4], name: "Completed" },
          ]} />
        </ChartCard>
        <ChartCard title="Priority mix" description="Workload urgency distribution">
          <DonutChart data={priorities.map((p) => ({ name: PRIORITY_LABELS[p.priority], value: p.count }))} innerLabel="tickets" />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard title="City demand" description="Where service requests originate">
          <BarsChart data={cities} dataKey="city" horizontal />
        </ChartCard>
        <ChartCard title="Top issue categories" description="Most frequent failure modes">
          <BarsChart data={categories} dataKey="category" horizontal color={CHART_COLORS[3]} />
        </ChartCard>
        <ChartCard title="Status distribution" description="Open vs closed lifecycle spread">
          <DonutChart data={statuses.map((s) => ({ name: s.label, value: s.count }))} innerLabel="tickets" />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard title="SLA movement" description="Response minutes and resolution hours trend" className="xl:col-span-2">
          <LinesChart
            data={resolutionSeries}
            series={[
              { key: "resolution", color: CHART_COLORS[2], name: "Resolution (h)" },
              { key: "response", color: CHART_COLORS[1], name: "Response (min)" },
            ]}
          />
        </ChartCard>
        <Card>
          <CardHeader title="SLA health" description="Open ticket risk bands" />
          <div className="space-y-4">
            {sla.map((s) => {
              const total = Math.max(1, sla.reduce((a, b) => a + b.count, 0));
              return (
                <div key={s.label}>
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <span className="text-ink-soft">{s.label}</span>
                    <span className="font-semibold text-ink">{s.count}</span>
                  </div>
                  <ProgressBar value={s.count} max={total} tone={s.tone === "green" ? "success" : s.tone === "amber" ? "warning" : "danger"} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Engineer leaderboard" description="Composite of rating, report quality and acceptance" />
        <Table>
          <THead columns={[{ label: "#" }, { label: "Engineer" }, { label: "Location" }, { label: "Open" }, { label: "Completed" }, { label: "Rating" }, { label: "Report quality" }, { label: "Score" }]} />
          <TBody>
            {engineers.map(({ engineer: e, openTickets, completedTickets, score }, i) => (
              <Tr key={e.id}>
                <Td><Badge tone={i === 0 ? "amber" : "gray"}>{i + 1}</Badge></Td>
                <Td><p className="text-[13px] font-medium text-ink">{e.name}</p><p className="text-[11px] text-ink-faint">{e.id}</p></Td>
                <Td>{e.city}, {e.state}</Td>
                <Td>{openTickets}</Td>
                <Td>{completedTickets}</Td>
                <Td>{e.rating.toFixed(1)}</Td>
                <Td>{e.reportQualityScore}/100</Td>
                <Td><span className="font-semibold text-ink">{score}</span><span className="text-ink-faint">/100</span></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>

      <p className="mt-4 text-[11px] text-ink-faint">
        Analytics are computed from the demo store in the browser. Date filters apply to ticket creation date.
      </p>
    </div>
  );
}
