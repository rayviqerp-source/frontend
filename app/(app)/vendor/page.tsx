"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Star,
  UserPlus,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { usePartnerScope } from "@/components/vendor/scope";
import { Badge, PriorityBadge, StatusBadge, VerificationBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { ProgressBar } from "@/components/charts";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { engineerLoadLabel } from "@/lib/selectors";
import { initials, scoreColor } from "@/lib/utils";

const WORKFLOW_STEPS: { title: string; body: string }[] = [
  {
    title: "You onboard the engineer",
    body: "Add profile, skills and KYC documents from the Vendor Panel. The record enters the RAYVIQ verification queue instantly.",
  },
  {
    title: "RAYVIQ verifies the profile",
    body: "The platform verification desk checks documents — approved engineers unlock dispatch rights across OEMs.",
  },
  {
    title: "Listed in the OEM Engineer Network",
    body: "OEMs see your engineers like a live roster: city, skills, product expertise, rating, workload and verification status.",
  },
  {
    title: "OEM dispatches an offer",
    body: "When a ticket matches, the OEM (or the recommendation engine) sends an offer with an SLA response deadline to your engineer.",
  },
  {
    title: "Engineer works the job",
    body: "Accept → contact customer → visit → digital service report with findings, parts and photos.",
  },
  {
    title: "OEM approves & performance updates",
    body: "Approved reports close the job and update your partner rating, SLA score and marketplace profile in real time.",
  },
];

export default function VendorDashboardPage() {
  const { state } = useStore();
  const { partner, engineers, isDemoFallback } = usePartnerScope();

  if (!partner) {
    return (
      <div>
        <PageHeader title="Partner dashboard" breadcrumbs={<Breadcrumbs />} />
        <Card>
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="No service partner linked"
            description="Sign in as Neha (USR-05 · BrightField) to preview the vendor workspace."
          />
        </Card>
      </div>
    );
  }

  const engineerIds = engineers.map((e) => e.id);
  const teamTickets = state.tickets.filter(
    (t) => t.assignedEngineerId != null && engineerIds.includes(t.assignedEngineerId),
  );

  const verified = engineers.filter((e) => e.verification === "approved").length;
  const inReview = engineers.filter((e) =>
    ["submitted", "under_verification", "more_info_required"].includes(e.verification),
  ).length;
  const offersPending = teamTickets.filter((t) => t.status === "offered").length;
  const activeJobs = teamTickets.filter((t) =>
    ["accepted", "contact_pending", "visit_scheduled", "in_progress"].includes(t.status),
  ).length;
  const reportsInReview = teamTickets.filter((t) =>
    ["report_submitted", "awaiting_oem_review", "clarification_required"].includes(t.status),
  ).length;
  const availableNow = engineers.filter((e) => e.availability === "available" && e.status === "active").length;
  const avgRating = engineers.length
    ? (engineers.reduce((s, e) => s + e.rating, 0) / engineers.length).toFixed(1)
    : "—";

  const recent = [...teamTickets]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Partner dashboard"
        description={`Your service team, live assignments and how OEMs discover your engineers on RAYVIQ.`}
        breadcrumbs={<Breadcrumbs />}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={partner.status === "active" ? "green" : "gray"} dot>
              {partner.name} · {partner.city}
            </Badge>
            <Link href="/vendor/onboarding">
              <Button>
                <UserPlus className="h-4 w-4" aria-hidden /> Onboard engineer
              </Button>
            </Link>
          </div>
        }
      />

      {isDemoFallback && (
        <p className="mb-4 rounded-lg border border-brand-100 bg-brand-50 px-3.5 py-2 text-[12px] text-brand-700">
          Previewing vendor scope for <strong>{partner.name}</strong> — sign in as Neha (USR-05) for the native
          partner session.
        </p>
      )}

      {/* Stats */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Engineers" value={engineers.length} tone="brand" icon={<Users className="h-4 w-4" aria-hidden />} hint={`${verified} verified · ${inReview} in review`} />
        <StatCard label="Available now" value={availableNow} tone="success" icon={<Wrench className="h-4 w-4" aria-hidden />} />
        <StatCard label="Active jobs" value={activeJobs} icon={<Activity className="h-4 w-4" aria-hidden />} hint={`${offersPending} offers pending · ${reportsInReview} reports in review`} />
        <StatCard label="Partner rating" value={avgRating} icon={<Star className="h-4 w-4" aria-hidden />} hint={`Team avg · ${engineers.reduce((s, e) => s + e.completedJobs, 0)} jobs done`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team */}
        <Card padded={false}>
          <div className="p-5">
            <CardHeader
              title="Your team"
              description="Verification, availability and workload at a glance."
              action={
                <Link href="/vendor/engineers" className="text-[13px] font-medium text-brand-700 hover:text-brand-800">
                  Manage →
                </Link>
              }
            />
          </div>
          {engineers.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                icon={<UserPlus className="h-5 w-5" />}
                title="No engineers yet"
                description="Onboard your first technician to start receiving OEM offers."
                action={
                  <Link href="/vendor/onboarding">
                    <Button size="sm">Onboard engineer</Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {engineers.slice(0, 6).map((e) => {
                const load = engineerLoadLabel(e);
                return (
                  <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700"
                      aria-hidden
                    >
                      {initials(e.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{e.name}</p>
                      <p className="text-[11px] text-ink-faint">
                        {e.city} · {e.completedJobs} jobs ·{" "}
                        <span
                          className={
                            e.rating > 0
                              ? scoreColor(
                                  Math.round(e.rating * 10 * 0.4 + e.reportQualityScore * 0.3 + e.acceptanceRate * 0.3),
                                )
                              : "text-ink-faint"
                          }
                        >
                          {e.rating > 0 ? `${e.rating.toFixed(1)}★` : "new"}
                        </span>
                      </p>
                    </div>
                    <div className="hidden w-24 sm:block">
                      <ProgressBar
                        value={e.currentLoad}
                        max={e.maxLoad}
                        tone={load.tone === "green" ? "success" : load.tone === "amber" ? "warning" : "danger"}
                      />
                      <span className="mt-0.5 block text-right text-[10px] text-ink-faint">
                        {e.currentLoad}/{e.maxLoad} load
                      </span>
                    </div>
                    <VerificationBadge status={e.verification} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Workflow explainer */}
        <Card>
          <CardHeader
            title="How OEMs see your team"
            description="The full dispatch loop your engineers take part in."
            action={<Zap className="h-4 w-4 text-ink-faint" aria-hidden />}
          />
          <ol className="space-y-3">
            {WORKFLOW_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    i === 0 ? "bg-brand-600 text-white" : "bg-surface-alt text-ink-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink">{s.title}</p>
                  <p className="mt-0.5 text-[12px] leading-5 text-ink-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-lg border border-success-100 bg-success-50 px-3 py-2.5 text-[12px] text-success-700">
            <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            Approved profiles also appear on the public{" "}
            <Link href="/marketplace" className="font-semibold underline hover:text-success-800">
              Technician Marketplace
            </Link>{" "}
            where customers can discover them directly.
          </p>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="mt-6" padded={false}>
        <div className="p-5">
          <CardHeader
            title="Live assignments"
            description="The newest movement across your team's tickets."
            action={
              <Link href="/vendor/assignments" className="text-[13px] font-medium text-brand-700 hover:text-brand-800">
                Open workflow →
              </Link>
            }
          />
        </div>
        {recent.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              icon={<ClipboardList className="h-5 w-5" />}
              title="No assignments yet"
              description="Once OEMs dispatch offers to your verified engineers, they'll stream in here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {recent.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/oem/tickets/${t.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 transition-colors hover:bg-surface-alt"
                >
                  <span className="font-mono text-[12px] font-medium text-ink">{t.ref}</span>
                  <span className="text-[13px] text-ink-soft">{t.issue.category}</span>
                  <span className="text-[12px] text-ink-faint">
                    {state.engineers.find((e) => e.id === t.assignedEngineerId)?.name ?? "unassigned"}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                    <ArrowRight className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
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
