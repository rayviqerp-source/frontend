"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Cpu,
  Download,
  FileText,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Ticket as TicketIcon,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  AMC_STATUS_LABELS,
  PRIORITY_LABELS,
  PRODUCT_CATEGORY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TONES,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, StatCard } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { downloadCsv, formatDate, formatDateTime, daysBetween, todayIso } from "@/lib/utils";

type TabKey = "overview" | "service" | "amc" | "documents";

export default function EquipmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state, toast } = useStore();
  const [tab, setTab] = useState<TabKey>("overview");

  const equipment = state.equipment.find((e) => e.id === params.id);
  const site = state.sites.find((s) => s.id === equipment?.siteId);
  const customer = state.customers.find((c) => c.id === site?.customerId);
  const amc = state.amcContracts.find((a) => a.siteId === equipment?.siteId);

  if (!equipment) {
    return (
      <EmptyState
        icon={<Cpu className="h-5 w-5" />}
        title="Equipment not found"
        description="This unit does not exist in the demo installed base."
        action={<Link href="/oem/products"><Button variant="outline">Back to products</Button></Link>}
      />
    );
  }

  const tickets = state.tickets
    .filter((t) => t.equipmentId === equipment.id || t.product.serialNumber === equipment.serialNumber)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const reports = tickets
    .map((t) => state.reports.find((r) => r.ticketId === t.id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
  const visits = state.maintenanceVisits.filter((v) => v.amcId === amc?.id);
  const warrantyDays = daysBetween(todayIso(), equipment.warrantyEndsOn);
  const openTickets = tickets.filter((t) => t.status !== "completed" && t.status !== "closed");

  const exportUnit = () =>
    downloadCsv(`equipment-${equipment.serialNumber.toLowerCase()}`, [
      {
        model: equipment.model,
        serialNumber: equipment.serialNumber,
        category: equipment.category,
        capacityKw: equipment.capacityKw,
        firmware: equipment.firmware ?? "",
        site: site?.name ?? "",
        customer: customer?.name ?? "",
        installedOn: equipment.installationDate,
        warrantyEndsOn: equipment.warrantyEndsOn,
        status: equipment.status,
        lifetimeTickets: tickets.length,
        amc: amc?.ref ?? "",
      },
    ]);

  const tabs: { key: TabKey; label: string; count?: number; icon: ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <Cpu className="h-3.5 w-3.5" /> },
    { key: "service", label: "Service history", count: tickets.length, icon: <Wrench className="h-3.5 w-3.5" /> },
    { key: "amc", label: "AMC & maintenance", count: visits.length, icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { key: "documents", label: "Documents", icon: <FileText className="h-3.5 w-3.5" /> },
  ];

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {equipment.model}
            <Badge tone={equipment.status === "operational" ? "green" : equipment.status === "faulty" ? "red" : equipment.status === "under_service" ? "amber" : "gray"} dot>
              {equipment.status.replace(/_/g, " ")}
            </Badge>
          </span>
        }
        description={`${equipment.serialNumber} · ${PRODUCT_CATEGORY_LABELS[equipment.category] ?? equipment.category} · ${site?.name ?? "Site"} · ${customer?.name ?? "Customer"}`}
        breadcrumbs={<Breadcrumbs />}
        actions={
          <>
            <Link href="/oem/products"><Button variant="outline"><ArrowLeft className="h-4 w-4" aria-hidden /> Back</Button></Link>
            <Button variant="outline" onClick={exportUnit}><Download className="h-4 w-4" aria-hidden /> Export</Button>
            <Button onClick={() => router.push("/oem/tickets/new")}><TicketIcon className="h-4 w-4" aria-hidden /> Log ticket</Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Capacity" value={`${equipment.capacityKw} kW`} hint={`${PRODUCT_CATEGORY_LABELS[equipment.category] ?? equipment.category}`} icon={<Cpu className="h-4 w-4" />} tone="brand" />
        <StatCard label="Warranty" value={warrantyDays < 0 ? "Expired" : `${warrantyDays} days`} hint={`Ends ${formatDate(equipment.warrantyEndsOn)}`} icon={<ShieldCheck className="h-4 w-4" />} tone={warrantyDays < 0 ? "danger" : warrantyDays <= 90 ? "warning" : "success"} />
        <StatCard label="Lifetime tickets" value={tickets.length} hint={`${openTickets.length} currently open`} icon={<TicketIcon className="h-4 w-4" />} tone={openTickets.length ? "warning" : "default"} />
        <StatCard label="Firmware" value={equipment.firmware ?? "Unknown"} hint={equipment.firmware === "v4.12.2" ? "Current release" : "Update available"} icon={<RefreshCw className="h-4 w-4" />} tone={equipment.firmware && equipment.firmware !== "v4.12.2" ? "warning" : "default"} />
      </div>

      <Card padded={false} className="overflow-hidden">
        <Tabs tabs={tabs} active={tab} onChange={(k) => setTab(k as TabKey)} className="px-3" />

        {tab === "overview" && (
          <div className="grid gap-5 p-5 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">Unit specification</h3>
                <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Fact label="Model" value={equipment.model} />
                  <Fact label="Serial number" value={equipment.serialNumber} mono />
                  <Fact label="Category" value={PRODUCT_CATEGORY_LABELS[equipment.category] ?? equipment.category} />
                  <Fact label="Rated capacity" value={`${equipment.capacityKw} kW`} />
                  <Fact label="Installed on" value={formatDate(equipment.installationDate)} />
                  <Fact label="Warranty ends" value={formatDate(equipment.warrantyEndsOn)} />
                  <Fact label="Firmware" value={equipment.firmware ?? "Not reported"} />
                  <Fact label="Current status" value={equipment.status.replace(/_/g, " ")} />
                </dl>
              </div>
              <div className="rounded-xl border border-line bg-surface-alt p-4">
                <h3 className="text-sm font-semibold text-ink">Service actions</h3>
                <p className="mt-1 text-[12px] leading-5 text-ink-muted">
                  Warranty and repair decisions remain with the OEM. RAYVIQ records evidence and recommendations for review.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => toast("Warranty review drafted (demo)", { description: "The OEM would review warranty eligibility before any decision." })}>
                    Raise warranty review
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast("Firmware update queued (demo)", { description: "No device command is sent in this demo environment." })}>
                    Queue firmware update
                  </Button>
                  {amc && (
                    <Link href={`/amc/${amc.id}`}><Button size="sm" variant="ghost">View AMC contract</Button></Link>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-line bg-surface-alt p-4">
                <h3 className="text-sm font-semibold text-ink">Site</h3>
                {site ? (
                  <div className="mt-2.5 space-y-1.5 text-[13px]">
                    <p className="font-medium text-ink">{site.name}</p>
                    <p className="flex items-start gap-1.5 text-ink-muted"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {site.address}, {site.city}</p>
                    <p className="text-[11px] text-ink-faint">{site.capacityKw} kW site capacity</p>
                    <button type="button" onClick={() => router.push(`/oem/sites#${site.id}`)} className="text-[12px] font-medium text-brand-700">Open site</button>
                  </div>
                ) : (
                  <p className="mt-2 text-[13px] text-ink-muted">Site record unavailable.</p>
                )}
              </div>
              <div className="rounded-xl border border-line bg-surface-alt p-4">
                <h3 className="text-sm font-semibold text-ink">Customer</h3>
                {customer ? (
                  <div className="mt-2.5 space-y-1.5 text-[13px]">
                    <p className="font-medium text-ink">{customer.name}</p>
                    <p className="text-ink-muted">{customer.city}, {customer.state}</p>
                    <button type="button" onClick={() => router.push(`/oem/customers/${customer.id}`)} className="text-[12px] font-medium text-brand-700">Open customer</button>
                  </div>
                ) : (
                  <p className="mt-2 text-[13px] text-ink-muted">Customer record unavailable.</p>
                )}
              </div>
              <div className="rounded-xl border border-line bg-surface-alt p-4">
                <h3 className="text-sm font-semibold text-ink">AMC</h3>
                {amc ? (
                  <div className="mt-2.5 space-y-1.5 text-[13px]">
                    <p className="font-mono text-[11px] font-medium text-ink">{amc.ref}</p>
                    <p className="text-ink-muted">{amc.planName}</p>
                    <Badge tone={amc.status === "active" ? "green" : "amber"}>{AMC_STATUS_LABELS[amc.status]}</Badge>
                  </div>
                ) : (
                  <p className="mt-2 text-[13px] text-ink-muted">This site has no AMC contract.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "service" && (
          <div>
            {tickets.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={<Wrench className="h-5 w-5" />} title="No service history" description="Tickets raised against this unit will appear here." />
              </div>
            ) : (
              <Table>
                <THead columns={[{ label: "Ticket" }, { label: "Issue" }, { label: "Priority" }, { label: "Created" }, { label: "Engineer" }, { label: "Report" }, { label: "Status" }]} />
                <TBody>
                  {tickets.map((t) => {
                    const engineer = state.engineers.find((e) => e.id === t.assignedEngineerId);
                    const report = reports.find((r) => r.ticketId === t.id);
                    return (
                      <Tr key={t.id} onClick={() => router.push(`/oem/tickets/${t.id}`)}>
                        <Td><span className="font-mono text-[11px] font-medium text-ink">{t.ref}</span></Td>
                        <Td><span className="block max-w-56 truncate text-[12px] text-ink-soft">{t.issue.category}</span></Td>
                        <Td><Badge tone={t.priority === "critical" ? "red" : t.priority === "high" ? "amber" : t.priority === "medium" ? "blue" : "gray"}>{PRIORITY_LABELS[t.priority]}</Badge></Td>
                        <Td><span className="text-[11px] text-ink-faint">{formatDate(t.createdAt)}</span></Td>
                        <Td><span className="text-[12px] text-ink-soft">{engineer?.name ?? "Unassigned"}</span></Td>
                        <Td>
                          {report ? (
                            <Link href={`/oem/reports/${report.id}`} onClick={(e) => e.stopPropagation()} className="text-[11px] font-medium text-brand-700">{report.id}</Link>
                          ) : (
                            <span className="text-[11px] text-ink-faint">—</span>
                          )}
                        </Td>
                        <Td><Badge tone={TICKET_STATUS_TONES[t.status]} dot>{TICKET_STATUS_LABELS[t.status]}</Badge></Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </div>
        )}

        {tab === "amc" && (
          <div className="p-5">
            {!amc ? (
              <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title="No AMC coverage" description="This site is not covered by a preventive maintenance contract." action={<Link href="/amc"><Button variant="outline">Browse AMC contracts</Button></Link>} />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><ShieldCheck className="h-4 w-4" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[11px] font-medium text-ink">{amc.ref}</span>
                    <span className="block text-[12px] text-ink-muted">{amc.planName} · {amc.serviceFrequency.replace(/_/g, " ")} · {amc.coverage.responseHours}h response</span>
                  </span>
                  <Badge tone={amc.status === "active" ? "green" : "amber"}>{AMC_STATUS_LABELS[amc.status]}</Badge>
                  <Link href={`/amc/${amc.id}`}><Button size="sm" variant="outline">Open contract</Button></Link>
                </div>
                {visits.length === 0 ? (
                  <p className="rounded-lg border border-line bg-surface-alt px-4 py-6 text-center text-[13px] text-ink-muted">No preventive visits scheduled for this contract.</p>
                ) : (
                  <ul className="space-y-2">
                    {visits.map((v) => (
                      <li key={v.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-3.5 py-2.5 text-[12px]">
                        <span className="font-medium text-ink">Due {formatDate(v.dueOn)}</span>
                        <span className="text-ink-faint">{v.checklist.filter((c) => c.done).length}/{v.checklist.length} checks</span>
                        <span className="ml-auto text-[11px] text-ink-faint">{v.scheduledFor ? formatDateTime(v.scheduledFor) : "Not scheduled"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "documents" && (
          <div className="p-5">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {[
                { name: "Warranty certificate.pdf", meta: `Valid to ${formatDate(equipment.warrantyEndsOn)}` },
                { name: "Commissioning report.pdf", meta: `Installed ${formatDate(equipment.installationDate)}` },
                { name: "Firmware release notes.pdf", meta: equipment.firmware ?? "Not reported" },
                { name: "Site handover checklist.pdf", meta: site?.name ?? "Site" },
              ].map((f) => (
                <div key={f.name} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-ink-muted"><FileText className="h-4 w-4" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{f.name}</span>
                    <span className="block text-[11px] text-ink-faint">{f.meta}</span>
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => toast("Document preview unavailable in demo", { description: "No real file is stored for this unit." })} aria-label={`Download ${f.name}`}>
                    <Download className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className={`mt-1 text-[13px] capitalize text-ink-soft ${mono ? "font-mono normal-case" : ""}`}>{value}</dd>
    </div>
  );
}
