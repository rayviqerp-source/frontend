"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  ClipboardList,
  Cpu,
  Download,
  Mail,
  MapPin,
  Phone,
  Ticket as TicketIcon,
  Users,
} from "lucide-react";
import { useMyOemId, useStore } from "@/lib/store";
import {
  AMC_STATUS_LABELS,
  OPEN_STATUSES,
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
import { downloadCsv, formatDate, relativeTime } from "@/lib/utils";

type TabKey = "overview" | "sites" | "equipment" | "tickets" | "amc";

const TYPE_LABELS: Record<string, string> = {
  end_customer: "End customer",
  dealer: "Dealer",
  epc: "EPC",
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state } = useStore();
  const oemId = useMyOemId();
  const [tab, setTab] = useState<TabKey>("overview");

  const customer = state.customers.find((c) => c.id === params.id);

  const sites = useMemo(
    () =>
      customer
        ? state.sites.filter((s) => {
            if (s.customerId !== customer.id) return false;
            if (!oemId) return true;
            return (
              state.equipment.some((e) => e.siteId === s.id && e.oemId === oemId) ||
              state.tickets.some((t) => t.siteId === s.id && t.oemId === oemId)
            );
          })
        : [],
    [customer, state.sites, state.equipment, state.tickets, oemId],
  );

  const siteIds = sites.map((s) => s.id);
  const equipment = useMemo(
    () => state.equipment.filter((e) => siteIds.includes(e.siteId) && (!oemId || e.oemId === oemId)),
    [state.equipment, siteIds, oemId],
  );
  const tickets = useMemo(
    () =>
      state.tickets
        .filter((t) => t.customerId === params.id && (!oemId || t.oemId === oemId))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [state.tickets, params.id, oemId],
  );
  const contracts = useMemo(
    () => state.amcContracts.filter((a) => a.customerId === params.id && (!oemId || a.oemId === oemId)),
    [state.amcContracts, params.id, oemId],
  );

  if (!customer) {
    return (
      <EmptyState
        icon={<Users className="h-5 w-5" />}
        title="Customer not found"
        description="This customer does not exist in the demo dataset."
        action={<Link href="/oem/customers"><Button variant="outline">Back to customers</Button></Link>}
      />
    );
  }

  const open = tickets.filter((t) => OPEN_STATUSES.includes(t.status));
  const capacity = sites.reduce((sum, s) => sum + s.capacityKw, 0);
  const activeAmc = contracts.filter((a) => a.status === "active");

  const exportProfile = () =>
    downloadCsv(`customer-${customer.id.toLowerCase()}`, [
      {
        customer: customer.name,
        type: TYPE_LABELS[customer.type] ?? customer.type,
        phone: customer.phone,
        email: customer.email ?? "",
        city: customer.city,
        state: customer.state,
        sites: sites.length,
        installedCapacityKw: capacity,
        equipment: equipment.length,
        openTickets: open.length,
        totalTickets: tickets.length,
        activeAmcContracts: activeAmc.length,
      },
    ]);

  const tabs: { key: TabKey; label: string; count?: number; icon: ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <Building2 className="h-3.5 w-3.5" /> },
    { key: "sites", label: "Sites", count: sites.length, icon: <MapPin className="h-3.5 w-3.5" /> },
    { key: "equipment", label: "Equipment", count: equipment.length, icon: <Cpu className="h-3.5 w-3.5" /> },
    { key: "tickets", label: "Tickets", count: tickets.length, icon: <TicketIcon className="h-3.5 w-3.5" /> },
    { key: "amc", label: "AMC", count: contracts.length, icon: <ClipboardList className="h-3.5 w-3.5" /> },
  ];

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {customer.name}
            <Badge tone={customer.type === "end_customer" ? "blue" : customer.type === "dealer" ? "violet" : "cyan"}>
              {TYPE_LABELS[customer.type] ?? customer.type}
            </Badge>
          </span>
        }
        description={`${customer.id} · ${customer.city}, ${customer.state} · customer since ${formatDate(customer.createdAt)}`}
        breadcrumbs={<Breadcrumbs />}
        actions={
          <>
            <Link href="/oem/customers"><Button variant="outline"><ArrowLeft className="h-4 w-4" aria-hidden /> Back</Button></Link>
            <Button variant="outline" onClick={exportProfile}><Download className="h-4 w-4" aria-hidden /> Export</Button>
            <Button onClick={() => router.push("/oem/tickets/new")}><TicketIcon className="h-4 w-4" aria-hidden /> Log ticket</Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Installed sites" value={sites.length} hint={`${(capacity / 1000).toFixed(2)} MW total capacity`} icon={<MapPin className="h-4 w-4" />} tone="brand" />
        <StatCard label="Equipment" value={equipment.length} hint={`${new Set(equipment.map((e) => e.model)).size} product models`} icon={<Cpu className="h-4 w-4" />} />
        <StatCard label="Open tickets" value={open.length} hint={`${tickets.length} lifetime tickets`} icon={<TicketIcon className="h-4 w-4" />} tone={open.some((t) => t.priority === "critical") ? "danger" : open.length ? "warning" : "success"} />
        <StatCard label="AMC coverage" value={activeAmc.length ? `${activeAmc.length} active` : "Not covered"} hint={contracts.length ? `${contracts.length} contract${contracts.length === 1 ? "" : "s"} on record` : "No contracts"} icon={<ClipboardList className="h-4 w-4" />} tone={activeAmc.length ? "success" : "warning"} />
      </div>

      <Card padded={false} className="overflow-hidden">
        <Tabs tabs={tabs} active={tab} onChange={(k) => setTab(k as TabKey)} className="px-3" />

        {tab === "overview" && (
          <div className="grid gap-5 p-5 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">Contact</h3>
                <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Fact label="Primary contact" value={customer.name} />
                  <Fact label="Company" value={customer.company ?? "—"} />
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Phone</dt>
                    <dd className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-soft"><Phone className="h-3.5 w-3.5" aria-hidden /> {customer.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Email</dt>
                    <dd className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-soft"><Mail className="h-3.5 w-3.5" aria-hidden /> {customer.email ?? "Not provided"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Address</dt>
                    <dd className="mt-1 flex items-start gap-1.5 text-[13px] text-ink-soft"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {customer.city}, {customer.state} {customer.pincode}</dd>
                  </div>
                  <Fact label="Customer type" value={TYPE_LABELS[customer.type] ?? customer.type} />
                </dl>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">Recent tickets</h3>
                  <button type="button" onClick={() => setTab("tickets")} className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-700">
                    View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                {tickets.length === 0 ? (
                  <p className="rounded-lg border border-line bg-surface-alt px-4 py-6 text-center text-[13px] text-ink-muted">No tickets raised yet.</p>
                ) : (
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {tickets.slice(0, 4).map((t) => (
                      <li key={t.id}>
                        <Link href={`/oem/tickets/${t.id}`} className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 transition-colors hover:bg-surface-alt/70">
                          <span className="font-mono text-[11px] font-medium text-ink">{t.ref}</span>
                          <span className="min-w-0 flex-1 truncate text-[12px] text-ink-muted">{t.issue.category}</span>
                          <Badge tone={TICKET_STATUS_TONES[t.status]} dot>{TICKET_STATUS_LABELS[t.status]}</Badge>
                          <span className="text-[11px] text-ink-faint">{relativeTime(t.createdAt)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-line bg-surface-alt p-4">
                <h3 className="text-sm font-semibold text-ink">Sites at a glance</h3>
                {sites.length === 0 ? (
                  <p className="mt-2 text-[13px] text-ink-muted">No sites mapped to this customer.</p>
                ) : (
                  <ul className="mt-3 space-y-2.5">
                    {sites.slice(0, 4).map((s) => (
                      <li key={s.id} className="text-[13px]">
                        <p className="font-medium text-ink">{s.name}</p>
                        <p className="text-[11px] text-ink-faint">{s.city} · {s.capacityKw} kW · {state.equipment.filter((e) => e.siteId === s.id).length} equipment</p>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={() => setTab("sites")} className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-brand-700">
                  All sites <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>

              <div className="rounded-xl border border-line bg-surface-alt p-4">
                <h3 className="text-sm font-semibold text-ink">Ticket health</h3>
                <dl className="mt-3 space-y-2 text-[13px]">
                  <div className="flex items-center justify-between"><dt className="text-ink-muted">Open</dt><dd className="font-medium text-ink">{open.length}</dd></div>
                  <div className="flex items-center justify-between"><dt className="text-ink-muted">Escalated</dt><dd className="font-medium text-ink">{tickets.filter((t) => t.status === "escalated").length}</dd></div>
                  <div className="flex items-center justify-between"><dt className="text-ink-muted">Completed</dt><dd className="font-medium text-ink">{tickets.filter((t) => t.status === "completed" || t.status === "closed").length}</dd></div>
                  <div className="flex items-center justify-between"><dt className="text-ink-muted">Critical open</dt><dd className="font-medium text-ink">{open.filter((t) => t.priority === "critical").length}</dd></div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {tab === "sites" && (
          <div>
            {sites.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={<MapPin className="h-5 w-5" />} title="No sites" description="Sites mapped to this customer will appear here." />
              </div>
            ) : (
              <Table>
                <THead columns={[{ label: "Site" }, { label: "Type" }, { label: "Location" }, { label: "Capacity" }, { label: "Equipment" }, { label: "Installed" }, { label: "AMC" }]} />
                <TBody>
                  {sites.map((s) => {
                    const amc = state.amcContracts.find((a) => a.siteId === s.id);
                    return (
                      <Tr key={s.id} onClick={() => router.push(`/oem/sites#${s.id}`)}>
                        <Td><span className="font-medium text-ink">{s.name}</span></Td>
                        <Td><Badge tone="gray">{s.siteType.replace(/_/g, " ")}</Badge></Td>
                        <Td><span className="text-[12px] text-ink-soft">{s.city}<br /><span className="text-ink-faint">{s.state} {s.pincode}</span></span></Td>
                        <Td>{s.capacityKw} kW</Td>
                        <Td>{state.equipment.filter((e) => e.siteId === s.id).length}</Td>
                        <Td><span className="text-[11px] text-ink-faint">{formatDate(s.installationDate)}</span></Td>
                        <Td>{amc ? <Badge tone={amc.status === "active" ? "green" : "amber"}>{AMC_STATUS_LABELS[amc.status]}</Badge> : <span className="text-[11px] text-ink-faint">Not covered</span>}</Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </div>
        )}

        {tab === "equipment" && (
          <div>
            {equipment.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={<Cpu className="h-5 w-5" />} title="No equipment" description="Equipment installed at this customer's sites will appear here." />
              </div>
            ) : (
              <Table>
                <THead columns={[{ label: "Model" }, { label: "Serial" }, { label: "Category" }, { label: "Site" }, { label: "Capacity" }, { label: "Warranty" }, { label: "Status" }]} />
                <TBody>
                  {equipment.map((e) => {
                    const site = sites.find((s) => s.id === e.siteId);
                    return (
                      <Tr key={e.id} onClick={() => router.push(`/oem/products/${e.id}`)}>
                        <Td><span className="font-medium text-ink">{e.model}</span></Td>
                        <Td><span className="font-mono text-[11px]">{e.serialNumber}</span></Td>
                        <Td><span className="text-[12px]">{PRODUCT_CATEGORY_LABELS[e.category] ?? e.category}</span></Td>
                        <Td><span className="text-[12px] text-ink-soft">{site?.name ?? "—"}</span></Td>
                        <Td>{e.capacityKw} kW</Td>
                        <Td><span className="text-[11px] text-ink-faint">{formatDate(e.warrantyEndsOn)}</span></Td>
                        <Td><Badge tone={e.status === "operational" ? "green" : e.status === "faulty" ? "red" : e.status === "under_service" ? "amber" : "gray"}>{e.status.replace(/_/g, " ")}</Badge></Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </div>
        )}

        {tab === "tickets" && (
          <div>
            {tickets.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={<TicketIcon className="h-5 w-5" />} title="No tickets" description="Tickets raised by this customer will appear here." />
              </div>
            ) : (
              <Table>
                <THead columns={[{ label: "Ticket" }, { label: "Issue" }, { label: "Site" }, { label: "Priority" }, { label: "Created" }, { label: "Status" }]} />
                <TBody>
                  {tickets.map((t) => {
                    const site = sites.find((s) => s.id === t.siteId);
                    return (
                      <Tr key={t.id} onClick={() => router.push(`/oem/tickets/${t.id}`)}>
                        <Td><span className="font-mono text-[11px] font-medium text-ink">{t.ref}</span></Td>
                        <Td><span className="block max-w-56 truncate text-[12px] text-ink-soft">{t.issue.category}</span></Td>
                        <Td><span className="text-[12px] text-ink-soft">{site?.name ?? t.location.city}</span></Td>
                        <Td><Badge tone={t.priority === "critical" ? "red" : t.priority === "high" ? "amber" : t.priority === "medium" ? "blue" : "gray"}>{PRIORITY_LABELS[t.priority]}</Badge></Td>
                        <Td><span className="text-[11px] text-ink-faint">{formatDate(t.createdAt)}</span></Td>
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
            {contracts.length === 0 ? (
              <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="No AMC contracts" description="Preventive maintenance contracts for this customer will appear here." action={<Link href="/amc"><Button variant="outline">Browse AMC contracts</Button></Link>} />
            ) : (
              <div className="space-y-2.5">
                {contracts.map((a) => {
                  const site = state.sites.find((s) => s.id === a.siteId);
                  const visits = state.maintenanceVisits.filter((v) => v.amcId === a.id);
                  const next = visits
                    .filter((v) => v.status !== "review_completed" && v.status !== "maintenance_completed")
                    .sort((x, y) => (x.dueOn < y.dueOn ? -1 : 1))[0];
                  return (
                    <Link key={a.id} href={`/amc/${a.id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:border-brand-200 hover:bg-brand-50/30">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                        <ClipboardList className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-[11px] font-medium text-ink">{a.ref}</span>
                        <span className="block truncate text-[12px] text-ink-muted">{a.planName} · {site?.name ?? "Site"}</span>
                      </span>
                      <span className="text-[11px] text-ink-faint">{next ? `Next visit ${formatDate(next.dueOn)}` : "No visit scheduled"}</span>
                      <Badge tone={a.status === "active" ? "green" : a.status === "expired" ? "red" : "amber"}>{AMC_STATUS_LABELS[a.status]}</Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-1 text-[13px] text-ink-soft">{value}</dd>
    </div>
  );
}
