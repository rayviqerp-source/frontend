"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  MapPin,
  Plus,
} from "lucide-react";
import { useStore, useMyOemId } from "@/lib/store";
import { formatDate, isOverdue } from "@/lib/utils";
import { PageHeader, Card, CardHeader, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { Table, TBody, Td, THead, Tr } from "@/components/ui/table";

const MAINT_LABEL: Record<string, string> = {
  maintenance_due: "Maintenance due",
  visit_planned: "Visit planned",
  engineer_assigned: "Engineer assigned",
  visit_scheduled: "Visit scheduled",
  inspection_started: "Inspection started",
  maintenance_completed: "Maintenance done",
  report_submitted: "Report submitted",
  review_completed: "Review completed",
};

const MAINT_TONE: Record<string, "gray" | "blue" | "cyan" | "amber" | "green" | "red" | "violet" | "indigo"> = {
  maintenance_due: "amber",
  visit_planned: "blue",
  engineer_assigned: "indigo",
  visit_scheduled: "cyan",
  inspection_started: "violet",
  maintenance_completed: "green",
  report_submitted: "blue",
  review_completed: "green",
};

export default function AmcPage() {
  const { state, toast } = useStore();
  const oemId = useMyOemId();
  const [tab, setTab] = useState("contracts");

  const contracts = useMemo(
    () => (oemId ? state.amcContracts.filter((c) => c.oemId === oemId) : state.amcContracts),
    [state.amcContracts, oemId],
  );
  const contractIds = new Set(contracts.map((c) => c.id));
  const maintVisits = state.maintenanceVisits.filter((v) => contractIds.has(v.amcId));

  const activeCount = contracts.filter((c) => c.status === "active").length;
  const renewals = contracts.filter((c) => c.status === "renewal_due" || c.status === "expiring").length;
  const dueVisits = maintVisits.filter((v) => v.status === "maintenance_due").length;
  const overdueVisits = maintVisits.filter(
    (v) => v.status === "maintenance_due" && isOverdue(v.dueOn),
  ).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="AMC & preventive maintenance"
        description="Annual maintenance contracts, coverage terms and scheduled preventive visits. AMC execution states mirror the platform's maintenance lifecycle."
        actions={
          <Button
            onClick={() => toast("Contract creation opens a guided form in the full build", {
              description: "Demo: contracts are seeded. Backend endpoint: POST /amc/contracts.",
              tone: "info",
            })}
          >
            <Plus className="h-4 w-4" /> New contract
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Active contracts" value={activeCount} hint={`${contracts.length} total`} icon={<ClipboardList className="h-4 w-4" />} tone="brand" />
        <StatCard label="Renewals due" value={renewals} hint="Expiring or renewal window" icon={<CalendarClock className="h-4 w-4" />} tone={renewals ? "warning" : "success"} />
        <StatCard label="Maintenance due" value={dueVisits} hint="Preventive visits pending" icon={<FileCheck2 className="h-4 w-4" />} />
        <StatCard label="Overdue visits" value={overdueVisits} hint="Past due date" icon={<AlertTriangle className="h-4 w-4" />} tone={overdueVisits ? "danger" : "success"} />
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "contracts", label: "Contracts", count: contracts.length },
          { key: "visits", label: "Maintenance visits", count: maintVisits.length },
          { key: "coverage", label: "Coverage reference" },
        ]}
        className="mb-4 mt-5"
      />

      {tab === "contracts" && (
        <div className="space-y-3">
          {contracts.length === 0 && (
            <EmptyState
              icon={<ClipboardList className="h-5 w-5" />}
              title="No AMC contracts"
              description="Contracts for your organisation will appear here."
            />
          )}
          {contracts.map((c) => {
            const site = state.sites.find((s) => s.id === c.siteId);
            const customer = state.customers.find((x) => x.id === c.customerId);
            const visits = maintVisits.filter((v) => v.amcId === c.id);
            return (
              <Card key={c.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-brand-700">{c.ref}</span>
                      <Badge
                        tone={
                          c.status === "active"
                            ? "green"
                            : c.status === "expiring" || c.status === "renewal_due"
                              ? "amber"
                              : c.status === "expired"
                                ? "red"
                                : "gray"
                        }
                        dot
                      >
                        {c.status.replace(/_/g, " ")}
                      </Badge>
                      <Badge tone="blue">{c.planName}</Badge>
                    </div>
                    <p className="mt-1.5 text-sm text-ink">{customer?.name ?? "Customer"} · {site?.name ?? "Site"}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-muted">
                      <MapPin className="h-3.5 w-3.5" /> {site?.city} · {site?.capacityKw} kW ·{" "}
                      {c.serviceFrequency.replace(/_/g, " ")} frequency
                    </p>
                  </div>
                  <div className="text-right text-[13px] text-ink-muted">
                    <p>
                      {formatDate(c.startsOn)} → <strong className="text-ink">{formatDate(c.endsOn)}</strong>
                    </p>
                    <p className="mt-1">
                      Response SLA: <strong className="text-ink">{c.coverage.responseHours}h</strong>
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {[
                    { label: "Preventive visits", on: c.coverage.preventiveVisits },
                    { label: "Breakdown visits", on: c.coverage.breakdownVisits },
                    { label: "Labour included", on: c.coverage.labourIncluded },
                    { label: "Travel included", on: c.coverage.travelIncluded },
                  ].map((cov) => (
                    <Badge key={cov.label} tone={cov.on ? "green" : "gray"}>
                      {cov.on ? "✓" : "✗"} {cov.label}
                    </Badge>
                  ))}
                  <Badge tone={c.coverage.spareParts === "included" ? "green" : c.coverage.spareParts === "chargeable" ? "amber" : "gray"}>
                    Spare parts: {c.coverage.spareParts}
                  </Badge>
                </div>

                <div className="mt-4 border-t border-line pt-3.5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                    Maintenance schedule ({visits.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {visits.map((v) => (
                      <span
                        key={v.id}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
                          v.status === "maintenance_due" && isOverdue(v.dueOn)
                            ? "border-danger-100 bg-danger-50 text-danger-700"
                            : "border-line bg-surface-alt/60 text-ink-soft"
                        }`}
                      >
                        <CalendarClock className="h-3 w-3" />
                        {formatDate(v.dueOn)}
                        <span className="font-medium">{MAINT_LABEL[v.status]}</span>
                      </span>
                    ))}
                    {visits.length === 0 && (
                      <span className="text-xs text-ink-faint">No visits scheduled</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "visits" && (
        <Card padded={false}>
          <Table>
            <THead
              columns={[
                { label: "Due date" },
                { label: "Contract" },
                { label: "Status" },
                { label: "Engineer" },
                { label: "Checklist" },
                { label: "Linked ticket" },
              ]}
            />
            <TBody>
              {maintVisits.map((v) => {
                const contract = state.amcContracts.find((c) => c.id === v.amcId);
                const engineer = state.engineers.find((e) => e.id === v.engineerId);
                const done = v.checklist.filter((x) => x.done).length;
                return (
                  <Tr key={v.id}>
                    <Td className="whitespace-nowrap">
                      <span className={isOverdue(v.dueOn) && v.status === "maintenance_due" ? "font-medium text-danger-600" : ""}>
                        {formatDate(v.dueOn)}
                      </span>
                    </Td>
                    <Td className="font-mono text-xs">{contract?.ref ?? v.amcId}</Td>
                    <Td>
                      <Badge tone={MAINT_TONE[v.status] ?? "gray"} dot>
                        {MAINT_LABEL[v.status] ?? v.status}
                      </Badge>
                    </Td>
                    <Td>{engineer?.name ?? <span className="text-ink-faint">Unassigned</span>}</Td>
                    <Td>
                      <span className="text-xs">
                        {done}/{v.checklist.length} done
                      </span>
                    </Td>
                    <Td>
                      {v.ticketId ? (
                        <Link
                          href={`/oem/tickets/${v.ticketId}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                        >
                          Open <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-xs text-ink-faint">—</span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
          {maintVisits.length === 0 && (
            <div className="p-5">
              <EmptyState title="No maintenance visits" description="Preventive visits will appear here." />
            </div>
          )}
        </Card>
      )}

      {tab === "coverage" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Maintenance lifecycle" description="Statuses a preventive visit moves through." />
            <ol className="space-y-2.5">
              {Object.entries(MAINT_LABEL).map(([key, label], i) => (
                <li key={key} className="flex items-center gap-3 text-[13px]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700">
                    {i + 1}
                  </span>
                  <span className="font-medium text-ink">{label}</span>
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <CardHeader
              title="Important"
              description="Commercial and warranty boundaries"
            />
            <ul className="space-y-2.5 text-[13px] leading-6 text-ink-muted">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success-600" />
                AMC covers preventive maintenance visits, breakdown response and (as per plan)
                labour/travel — spare parts follow the contract&apos;s policy.
              </li>
              <li className="flex gap-2">
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-warning-600" />
                Warranty approval, repair authorisation and replacement decisions always stay with
                the OEM, never automated by RAYVIQ.
              </li>
              <li className="flex gap-2">
                <CalendarClock className="mt-1 h-4 w-4 shrink-0 text-brand-600" />
                Response SLA hours on the contract drive escalation thresholds for AMC-covered
                equipment.
              </li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
