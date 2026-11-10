"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  ClipboardList,
  Clock,
  MapPin,
  Send,
  ThumbsUp,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { usePartnerScope, isExpiringSoon } from "@/components/vendor/scope";
import { Badge, PriorityBadge, StatusBadge, VerificationBadge } from "@/components/ui/badge";
import { Card, PageHeader, StatCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatDate, isOverdue, relativeTime } from "@/lib/utils";
import type { Ticket } from "@/lib/types";

type TabKey = "offers" | "active" | "reports" | "completed";

const TAB_STATUS: Record<TabKey, string[]> = {
  offers: ["offered"],
  active: ["accepted", "contact_pending", "visit_scheduled", "in_progress"],
  reports: ["report_submitted", "awaiting_oem_review", "clarification_required"],
  completed: ["completed", "closed"],
};

const FLOW_STEPS = [
  { icon: Send, title: "Offer dispatched", body: "OEM sends an offer with an SLA response deadline." },
  { icon: ThumbsUp, title: "Engineer responds", body: "Accept or decline — no response expires back to the queue." },
  { icon: MapPin, title: "Contact & visit", body: "Customer call, scheduled visit, on-site inspection." },
  { icon: ClipboardList, title: "Service report", body: "Findings, diagnosis, parts and photos submitted digitally." },
  { icon: ClipboardCheck, title: "OEM review", body: "Approved → job closes, partner scores update live." },
];

export default function VendorAssignmentsPage() {
  const router = useRouter();
  const { state } = useStore();
  const { partner, engineers } = usePartnerScope();
  const [tab, setTab] = useState<TabKey>("offers");

  const engineerIds = useMemo(() => engineers.map((e) => e.id), [engineers]);

  const teamTickets = useMemo(
    () =>
      state.tickets.filter(
        (t) => t.assignedEngineerId != null && engineerIds.includes(t.assignedEngineerId),
      ),
    [state.tickets, engineerIds],
  );

  const rows = useMemo(() => {
    const allowed = TAB_STATUS[tab];
    return teamTickets
      .filter((t) => allowed.includes(t.status))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [teamTickets, tab]);

  const counts: Record<TabKey, number> = {
    offers: teamTickets.filter((t) => t.status === "offered").length,
    active: teamTickets.filter((t) => TAB_STATUS.active.includes(t.status)).length,
    reports: teamTickets.filter((t) => TAB_STATUS.reports.includes(t.status)).length,
    completed: teamTickets.filter((t) => TAB_STATUS.completed.includes(t.status)).length,
  };

  const pendingOffers = state.assignments.filter(
    (a) => a.state === "pending_offer" && engineerIds.includes(a.engineerId),
  );
  const expiringSoon = pendingOffers.filter((a) => isExpiringSoon(a.responseDeadline)).length;

  const oemName = (oemId: string) => state.oems.find((o) => o.id === oemId)?.name ?? "OEM";
  const engineerName = (id?: string | null) =>
    state.engineers.find((e) => e.id === id)?.name ?? "Unassigned";

  if (!partner) {
    return (
      <div>
        <PageHeader title="Assignment workflow" breadcrumbs={<Breadcrumbs />} />
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-5 w-5" />}
            title="No service partner linked"
            description="Sign in as Neha (USR-05 · BrightField) to preview the vendor workspace."
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Assignment workflow"
        description={`How tickets reach ${partner.name}'s engineers — from OEM offer to approved service report.`}
        breadcrumbs={<Breadcrumbs />}
        actions={
          <Badge tone={pendingOffers.length ? "amber" : "green"} dot>
            {pendingOffers.length} offer{pendingOffers.length === 1 ? "" : "s"} awaiting response
          </Badge>
        }
      />

      {/* -------- Flow explainer -------- */}
      <Card className="mb-6">
        <ol className="grid gap-3 md:grid-cols-5">
          {FLOW_STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className="relative rounded-lg border border-line bg-surface-alt p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="text-[11px] font-semibold text-ink-faint">0{i + 1}</span>
                  {i < FLOW_STEPS.length - 1 && (
                    <ArrowRight className="ml-auto hidden h-3.5 w-3.5 text-ink-faint md:block" aria-hidden />
                  )}
                </div>
                <p className="mt-2 text-[12px] font-semibold text-ink">{s.title}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-ink-muted">{s.body}</p>
              </li>
            );
          })}
        </ol>
      </Card>

      {/* -------- Stats -------- */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Offers pending"
          value={counts.offers}
          tone={counts.offers ? "warning" : "success"}
          icon={<Send className="h-4 w-4" aria-hidden />}
          hint={expiringSoon ? `${expiringSoon} expiring within 30 min` : "None expiring soon"}
        />
        <StatCard label="Active jobs" value={counts.active} tone="brand" icon={<Clock className="h-4 w-4" aria-hidden />} />
        <StatCard label="Reports in OEM review" value={counts.reports} icon={<ClipboardList className="h-4 w-4" aria-hidden />} />
        <StatCard label="Completed" value={counts.completed} tone="success" icon={<BadgeCheck className="h-4 w-4" aria-hidden />} />
      </div>

      {/* -------- Tabs + table -------- */}
      <Tabs
        tabs={[
          { key: "offers", label: "Offers", count: counts.offers },
          { key: "active", label: "Active", count: counts.active },
          { key: "reports", label: "Reports in review", count: counts.reports },
          { key: "completed", label: "Completed", count: counts.completed },
        ]}
        active={tab}
        onChange={(k) => setTab(k as TabKey)}
        className="mb-4"
      />

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<ClipboardList className="h-5 w-5" />}
              title={
                tab === "offers"
                  ? "No offers waiting"
                  : tab === "active"
                    ? "No active jobs"
                    : tab === "reports"
                      ? "No reports in review"
                      : "Nothing completed yet"
              }
              description={
                partner.name +
                "'s engineers receive OEM offers the moment they're verified and available — check the Offers tab after dispatch."
              }
            />
          </div>
        ) : (
          <Table>
            <THead
              columns={[
                { label: "Ticket" },
                { label: "Engineer" },
                { label: "OEM" },
                { label: "Issue" },
                { label: "Priority" },
                { label: "Status" },
                { label: tab === "offers" ? "Respond by" : "Updated" },
              ]}
            />
            <TBody>
              {rows.map((t: Ticket) => {
                const offer = state.assignments.find(
                  (a) => a.ticketId === t.id && a.engineerId === t.assignedEngineerId && a.state === "pending_offer",
                );
                const late = tab === "offers" && offer ? isOverdue(offer.responseDeadline) : false;
                return (
                  <Tr key={t.id} onClick={() => router.push(`/oem/tickets/${t.id}`)}>
                    <Td>
                      <span className="font-mono text-[12px] font-medium text-ink">{t.ref}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-faint">
                        {t.location.city}
                      </span>
                    </Td>
                    <Td>
                      <p className="text-[13px] text-ink">{engineerName(t.assignedEngineerId)}</p>
                    </Td>
                    <Td><span className="text-[12px]">{oemName(t.oemId)}</span></Td>
                    <Td className="max-w-56">
                      <p className="truncate text-[13px] text-ink-soft">{t.issue.category}</p>
                    </Td>
                    <Td><PriorityBadge priority={t.priority} /></Td>
                    <Td><StatusBadge status={t.status} /></Td>
                    <Td>
                      {tab === "offers" && offer ? (
                        <span className={`text-[12px] ${late ? "font-medium text-danger-600" : "text-ink-soft"}`}>
                          {formatDate(offer.responseDeadline)}
                          {late && <Badge tone="red" className="ml-1.5">Expired</Badge>}
                        </span>
                      ) : (
                        <span className="text-[12px] text-ink-muted">{relativeTime(t.updatedAt)}</span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </div>

      {/* -------- Verification note -------- */}
      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px] text-ink-soft">
            <BadgeCheck className="h-4 w-4 shrink-0 text-success-600" aria-hidden />
            <span>
              {engineers.filter((e) => e.verification === "approved").length} of {engineers.length} engineers are
              verified and can receive offers right now.
            </span>
          </div>
          <div className="flex gap-2">
            {engineers
              .filter((e) => e.verification !== "approved")
              .slice(0, 3)
              .map((e) => (
                <VerificationBadge key={e.id} status={e.verification} />
              ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
