"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Download,
  FileText,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  AMC_STATUS_LABELS,
  MAINTENANCE_STATUS_LABELS,
  PRODUCT_CATEGORY_LABELS,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, StatCard } from "@/components/ui/card";
import { ProgressBar } from "@/components/charts";
import { Tabs } from "@/components/ui/tabs";
import { Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { downloadCsv, formatDate, formatDateTime, daysBetween, todayIso } from "@/lib/utils";

type TabKey = "overview" | "coverage" | "equipment" | "visits" | "documents";

function amcTone(status: string) {
  return status === "active" ? "green" : status === "expiring" || status === "renewal_due" ? "amber" : status === "expired" ? "red" : "gray";
}

function maintenanceTone(status: string) {
  if (status === "review_completed" || status === "maintenance_completed") return "green";
  if (status === "report_submitted") return "violet";
  if (status === "engineer_assigned" || status === "visit_scheduled" || status === "visit_planned" || status === "inspection_started") return "blue";
  return "amber";
}

export default function AmcDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state, toast } = useStore();
  const [tab, setTab] = useState<TabKey>("overview");
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);

  const contract = state.amcContracts.find((c) => c.id === params.id);
  const customer = state.customers.find((c) => c.id === contract?.customerId);
  const site = state.sites.find((s) => s.id === contract?.siteId);
  const equipment = useMemo(
    () => (contract ? state.equipment.filter((e) => contract.equipmentIds.includes(e.id)) : []),
    [contract, state.equipment],
  );
  const visits = useMemo(
    () =>
      contract
        ? state.maintenanceVisits
            .filter((v) => v.amcId === contract.id)
            .sort((a, b) => (a.dueOn < b.dueOn ? 1 : -1))
        : [],
    [contract, state.maintenanceVisits],
  );

  if (!contract) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-5 w-5" />}
        title="AMC contract not found"
        description="This contract does not exist in the demo dataset, or belongs to another OEM."
        action={
          <Link href="/amc">
            <Button variant="outline">Back to AMC & maintenance</Button>
          </Link>
        }
      />
    );
  }

  const completed = visits.filter((v) => v.status === "review_completed" || v.status === "maintenance_completed");
  const upcoming = visits
    .filter((v) => v.status !== "review_completed" && v.status !== "maintenance_completed")
    .sort((a, b) => (a.dueOn < b.dueOn ? -1 : 1));
  const nextVisit = upcoming[0];
  const contractDaysLeft = daysBetween(todayIso(), contract.endsOn);
  const checklistDone = visits.reduce((sum, v) => sum + v.checklist.filter((c) => c.done).length, 0);
  const checklistTotal = visits.reduce((sum, v) => sum + v.checklist.length, 0);
  const visitProgress = checklistTotal ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  const coverageItems = [
    { label: "Preventive maintenance visits", included: contract.coverage.preventiveVisits },
    { label: "Breakdown visits", included: contract.coverage.breakdownVisits },
    { label: "Labour", included: contract.coverage.labourIncluded },
    { label: "Travel & logistics", included: contract.coverage.travelIncluded },
  ];

  const downloadSummary = () => {
    downloadCsv(`amc-${contract.ref.replace(/\W+/g, "-").toLowerCase()}`, [
      {
        ref: contract.ref,
        plan: contract.planName,
        status: contract.status,
        customer: customer?.name ?? "",
        site: site?.name ?? "",
        startsOn: contract.startsOn,
        endsOn: contract.endsOn,
        frequency: contract.serviceFrequency,
        responseHours: contract.coverage.responseHours,
        spareParts: contract.coverage.spareParts,
        equipment: equipment.map((e) => e.serialNumber).join(" | "),
        completedVisits: completed.length,
        upcomingVisits: upcoming.length,
      },
    ]);
    toast("Contract summary downloaded", { description: "A CSV summary was generated locally for this demo." });
  };

  const tabs: { key: TabKey; label: string; count?: number; icon: ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <ClipboardList className="h-3.5 w-3.5" /> },
    { key: "coverage", label: "Coverage", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { key: "equipment", label: "Equipment", count: equipment.length, icon: <Cpu className="h-3.5 w-3.5" /> },
    { key: "visits", label: "Maintenance visits", count: visits.length, icon: <CalendarClock className="h-3.5 w-3.5" /> },
    { key: "documents", label: "Documents", icon: <FileText className="h-3.5 w-3.5" /> },
  ];

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{contract.ref}</span>
            <Badge tone={amcTone(contract.status)} dot>{AMC_STATUS_LABELS[contract.status]}</Badge>
          </span>
        }
        description={`${contract.planName} · ${customer?.name ?? "Customer"} · ${site?.name ?? "Site"} · ${formatDate(contract.startsOn)} to ${formatDate(contract.endsOn)}`}
        breadcrumbs={<Breadcrumbs />}
        actions={
          <>
            <Link href="/amc">
              <Button variant="outline"><ArrowLeft className="h-4 w-4" aria-hidden /> Back</Button>
            </Link>
            <Button variant="outline" onClick={() => toast("Renewal reminder queued", { description: "Demo only — no email or WhatsApp message is actually sent." })}>
              <RefreshCw className="h-4 w-4" aria-hidden /> Send renewal reminder
            </Button>
            <Button onClick={() => router.push("/oem/tickets/new")}>
              <Wrench className="h-4 w-4" aria-hidden /> Log breakdown
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Next preventive visit"
          value={nextVisit ? formatDate(nextVisit.dueOn) : "None scheduled"}
          hint={nextVisit ? MAINTENANCE_STATUS_LABELS[nextVisit.status] : "All visits completed"}
          icon={<CalendarClock className="h-4 w-4" />}
          tone={nextVisit ? "warning" : "success"}
        />
        <StatCard
          label="Visits completed"
          value={completed.length}
          hint={`${upcoming.length} outstanding · ${visits.length} total`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Checklist completion"
          value={`${visitProgress}%`}
          hint={`${checklistDone}/${checklistTotal} checklist items`}
          icon={<ClipboardList className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Contract term"
          value={contractDaysLeft >= 0 ? `${contractDaysLeft} days left` : "Expired"}
          hint={`Response SLA ${contract.coverage.responseHours}h`}
          icon={<ShieldCheck className="h-4 w-4" />}
          tone={contractDaysLeft < 0 ? "danger" : contractDaysLeft < 45 ? "warning" : "default"}
        />
      </div>

      {(contract.status === "expiring" || contract.status === "renewal_due") && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-warning-100 bg-warning-50 px-4 py-3">
          <RefreshCw className="h-4 w-4 text-warning-600" aria-hidden />
          <p className="min-w-0 flex-1 text-[13px] text-warning-700">
            This contract is due for renewal. Coverage ends on {formatDate(contract.endsOn)}.
          </p>
          <Button size="sm" variant="outline" onClick={() => toast("Renewal draft created (demo)", { description: "A renewal draft would be prepared for the OEM to review." })}>
            Prepare renewal
          </Button>
        </div>
      )}

      <Card padded={false} className="overflow-hidden">
        <Tabs tabs={tabs} active={tab} onChange={(k) => setTab(k as TabKey)} className="px-3" />

        {tab === "overview" && (
          <div className="grid gap-5 p-5 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">Contract details</h3>
                <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Fact label="Plan" value={contract.planName} />
                  <Fact label="Service frequency" value={contract.serviceFrequency.replace(/_/g, " ")} capitalize />
                  <Fact label="Contract period" value={`${formatDate(contract.startsOn)} — ${formatDate(contract.endsOn)}`} />
                  <Fact label="Response SLA" value={`${contract.coverage.responseHours} hours`} />
                  <Fact label="Spare parts" value={contract.coverage.spareParts.replace(/_/g, " ")} capitalize />
                  <Fact label="Created" value={formatDate(contract.createdAt)} />
                </dl>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">Notes</h3>
                <p className="mt-2 rounded-lg border border-line bg-surface-alt px-3.5 py-3 text-[13px] leading-6 text-ink-soft">
                  {contract.notes ?? "No contract notes recorded."}
                </p>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">Preventive schedule</h3>
                  <span className="text-[11px] text-ink-faint">{completed.length} of {visits.length} completed</span>
                </div>
                <ProgressBar value={visits.length ? Math.round((completed.length / visits.length) * 100) : 0} tone="brand" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-line bg-surface-alt p-4">
                <h3 className="text-sm font-semibold text-ink">Customer</h3>
                {customer ? (
                  <div className="mt-3 space-y-2 text-[13px]">
                    <p className="font-medium text-ink">{customer.name}</p>
                    <p className="flex items-center gap-2 text-ink-muted"><Phone className="h-3.5 w-3.5" aria-hidden /> {customer.phone}</p>
                    <p className="flex items-center gap-2 text-ink-muted"><MapPin className="h-3.5 w-3.5" aria-hidden /> {customer.city}, {customer.state} {customer.pincode}</p>
                    <p className="text-[11px] capitalize text-ink-faint">{customer.type.replace(/_/g, " ")}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-[13px] text-ink-muted">Customer record unavailable.</p>
                )}
              </div>
              <div className="rounded-xl border border-line bg-surface-alt p-4">
                <h3 className="text-sm font-semibold text-ink">Site</h3>
                {site ? (
                  <div className="mt-3 space-y-2 text-[13px]">
                    <p className="font-medium text-ink">{site.name}</p>
                    <p className="text-ink-muted">{site.address}</p>
                    <p className="text-ink-muted">{site.city}, {site.state} {site.pincode}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Badge tone="blue">{site.capacityKw} kW</Badge>
                      <Badge tone="gray">{site.siteType.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-[13px] text-ink-muted">Site record unavailable.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "coverage" && (
          <div className="grid gap-5 p-5 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">What is included</h3>
              <ul className="mt-3 space-y-2.5">
                {coverageItems.map((item) => (
                  <li key={item.label} className="flex items-center gap-2.5 text-[13px]">
                    {item.included ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" aria-hidden />
                    ) : (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-line-strong text-[10px] text-ink-faint">–</span>
                    )}
                    <span className={item.included ? "text-ink-soft" : "text-ink-faint line-through"}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-line p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Spare parts</p>
                <p className="mt-1 text-sm font-medium capitalize text-ink">{contract.coverage.spareParts.replace(/_/g, " ")}</p>
                <p className="mt-1 text-[12px] leading-5 text-ink-muted">
                  {contract.coverage.spareParts === "included"
                    ? "Consumables and replacement parts are covered within the contract."
                    : contract.coverage.spareParts === "chargeable"
                      ? "Parts are chargeable at agreed rates, subject to OEM approval."
                      : "Parts are not covered and must be quoted separately."}
                </p>
              </div>
              <div className="rounded-xl border border-warning-100 bg-warning-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-warning-700">Warranty decisions</p>
                <p className="mt-1 text-[12px] leading-5 text-warning-700/80">
                  RAYVIQ records evidence and recommendations only. Warranty and repair approval always remains with the OEM.
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === "equipment" && (
          <div>
            {equipment.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={<Cpu className="h-5 w-5" />} title="No equipment linked" description="Equipment covered under this contract will appear here." />
              </div>
            ) : (
              <Table>
                <THead columns={[{ label: "Model" }, { label: "Serial" }, { label: "Category" }, { label: "Capacity" }, { label: "Installed" }, { label: "Warranty ends" }, { label: "Status" }]} />
                <TBody>
                  {equipment.map((e) => (
                    <Tr key={e.id}>
                      <Td><span className="font-medium text-ink">{e.model}</span></Td>
                      <Td><span className="font-mono text-[11px]">{e.serialNumber}</span></Td>
                      <Td>{PRODUCT_CATEGORY_LABELS[e.category] ?? e.category}</Td>
                      <Td>{e.capacityKw} kW</Td>
                      <Td>{formatDate(e.installationDate)}</Td>
                      <Td>{formatDate(e.warrantyEndsOn)}</Td>
                      <Td>
                        <Badge tone={e.status === "operational" ? "green" : e.status === "faulty" ? "red" : e.status === "under_service" ? "amber" : "gray"}>
                          {e.status.replace(/_/g, " ")}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        )}

        {tab === "visits" && (
          <div className="p-5">
            {visits.length === 0 ? (
              <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="No maintenance visits" description="Preventive visits will be generated from the contract frequency." />
            ) : (
              <div className="space-y-2.5">
                {visits.map((v) => {
                  const engineer = state.engineers.find((e) => e.id === v.engineerId);
                  const done = v.checklist.filter((c) => c.done).length;
                  const open = expandedVisit === v.id;
                  return (
                    <div key={v.id} className="rounded-xl border border-line">
                      <button
                        type="button"
                        onClick={() => setExpandedVisit(open ? null : v.id)}
                        className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-alt/60"
                        aria-expanded={open}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                          <CalendarClock className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-medium text-ink">Due {formatDate(v.dueOn)}</span>
                          <span className="block text-[11px] text-ink-faint">
                            {v.scheduledFor ? `Scheduled ${formatDateTime(v.scheduledFor)}` : "Not scheduled"}
                            {engineer ? ` · ${engineer.name}` : ""}
                          </span>
                        </span>
                        <span className="hidden text-[11px] text-ink-faint sm:block">{done}/{v.checklist.length} checks</span>
                        <Badge tone={maintenanceTone(v.status)} dot>{MAINTENANCE_STATUS_LABELS[v.status]}</Badge>
                        <span className="text-ink-faint" aria-hidden>{open ? "−" : "+"}</span>
                      </button>
                      {open && (
                        <div className="border-t border-line px-4 py-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Checklist</p>
                          <ul className="grid gap-2 sm:grid-cols-2">
                            {v.checklist.map((c) => (
                              <li key={c.label} className="flex items-start gap-2 text-[13px]">
                                {c.done ? (
                                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600" aria-hidden />
                                ) : (
                                  <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-line-strong" aria-hidden />
                                )}
                                <span className={c.done ? "text-ink-soft" : "text-ink-muted"}>{c.label}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {v.reportId && (
                              <Link href={`/oem/reports/${v.reportId}`}>
                                <Button size="sm" variant="outline"><FileText className="h-3.5 w-3.5" aria-hidden /> View report</Button>
                              </Link>
                            )}
                            {v.status !== "review_completed" && (
                              <Button size="sm" variant="ghost" onClick={() => toast("Visit scheduling is a demo action", { description: "A planner flow would open here in production." })}>
                                <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Plan visit
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "documents" && (
          <div className="p-5">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {[
                { name: "Signed AMC agreement.pdf", meta: "Contract · 1.2 MB" },
                { name: "Site survey report.pdf", meta: "Site · 860 KB" },
                { name: "Preventive checklist template.pdf", meta: "Template · 240 KB" },
                { name: "Renewal quotation draft.pdf", meta: "Commercial · 310 KB" },
              ].map((f) => (
                <div key={f.name} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-ink-muted">
                    <FileText className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{f.name}</span>
                    <span className="block text-[11px] text-ink-faint">{f.meta}</span>
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => toast("Document preview unavailable in demo", { description: "No real file is stored for this contract." })} aria-label={`Download ${f.name}`}>
                    <Download className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={downloadSummary}>
                <Download className="h-4 w-4" aria-hidden /> Export contract summary
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Fact({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className={`mt-1 text-[13px] text-ink-soft ${capitalize ? "capitalize" : ""}`}>{value}</dd>
    </div>
  );
}
