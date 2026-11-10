"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  ChevronDown,
  Cpu,
  Download,
  MapPin,
  Plus,
  Ticket as TicketIcon,
} from "lucide-react";
import { useMyOemId, useStore } from "@/lib/store";
import {
  AMC_STATUS_LABELS,
  OPEN_STATUSES,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TONES,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Pagination, SearchInput, Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { downloadCsv, formatDate } from "@/lib/utils";

const PAGE_SIZE = 10;

const SITE_TYPE_LABELS: Record<string, string> = {
  rooftop: "Rooftop",
  ground_mount: "Ground mount",
  solar_farmland: "Solar farmland",
  commercial_rooftop: "Commercial rooftop",
};

export default function SitesPage() {
  const router = useRouter();
  const { state, toast } = useStore();
  const oemId = useMyOemId();
  const [query, setQuery] = useState("");
  const [siteType, setSiteType] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hash) setExpanded(hash);
  }, []);

  const sites = useMemo(
    () =>
      state.sites.filter((s) => {
        if (!oemId) return true;
        return (
          state.equipment.some((e) => e.siteId === s.id && e.oemId === oemId) ||
          state.tickets.some((t) => t.siteId === s.id && t.oemId === oemId)
        );
      }),
    [state.sites, state.equipment, state.tickets, oemId],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sites
      .filter((s) => {
        if (siteType && s.siteType !== siteType) return false;
        if (!q) return true;
        const customer = state.customers.find((c) => c.id === s.customerId);
        return (
          s.name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.state.toLowerCase().includes(q) ||
          (customer?.name ?? "").toLowerCase().includes(q)
        );
      })
      .map((s) => {
        const customer = state.customers.find((c) => c.id === s.customerId);
        const equipment = state.equipment.filter((e) => e.siteId === s.id && (!oemId || e.oemId === oemId));
        const tickets = state.tickets.filter((t) => t.siteId === s.id && (!oemId || t.oemId === oemId));
        const open = tickets.filter((t) => OPEN_STATUSES.includes(t.status));
        const amc = state.amcContracts.find((a) => a.siteId === s.id && (!oemId || a.oemId === oemId));
        return { s, customer, equipment, tickets, open, amc };
      })
      .sort((a, b) => b.s.capacityKw - a.s.capacityKw);
  }, [sites, query, siteType, state.customers, state.equipment, state.tickets, state.amcContracts, oemId]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const capacity = rows.reduce((sum, r) => sum + r.s.capacityKw, 0);
  const uncovered = rows.filter((r) => !r.amc);

  const exportRows = () =>
    downloadCsv(
      "rayviq-sites",
      rows.map((r) => ({
        site: r.s.name,
        customer: r.customer?.name ?? "",
        type: r.s.siteType,
        address: r.s.address,
        city: r.s.city,
        state: r.s.state,
        pincode: r.s.pincode,
        capacityKw: r.s.capacityKw,
        equipment: r.equipment.length,
        openTickets: r.open.length,
        amc: r.amc?.ref ?? "",
        installedOn: r.s.installationDate,
      })),
    );

  return (
    <div>
      <PageHeader
        title="Sites & installations"
        description="Every installed site, its capacity, equipment and service coverage. Open a site to see equipment health and linked tickets."
        breadcrumbs={<Breadcrumbs />}
        actions={
          <>
            <Button variant="outline" onClick={exportRows}>
              <Download className="h-4 w-4" aria-hidden /> Export
            </Button>
            <Button onClick={() => toast("Site onboarding is a demo action", { description: "A site onboarding wizard would open here in production." })}>
              <Plus className="h-4 w-4" aria-hidden /> Add site
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sites" value={rows.length} hint={`${new Set(rows.map((r) => r.s.customerId)).size} customers`} icon={<MapPin className="h-4 w-4" />} tone="brand" />
        <StatCard label="Installed capacity" value={`${(capacity / 1000).toFixed(2)} MW`} hint={`${capacity.toLocaleString("en-IN")} kW`} icon={<Building2 className="h-4 w-4" />} tone="success" />
        <StatCard label="Equipment" value={rows.reduce((sum, r) => sum + r.equipment.length, 0)} hint={`${new Set(rows.flatMap((r) => r.equipment.map((e) => e.model))).size} models`} icon={<Cpu className="h-4 w-4" />} />
        <StatCard label="Without AMC" value={uncovered.length} hint={uncovered.length ? "Preventive coverage gap" : "All sites covered"} icon={<CalendarClock className="h-4 w-4" />} tone={uncovered.length ? "warning" : "success"} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search site, customer or city…" className="w-full sm:w-80" />
        <Select
          value={siteType}
          onChange={(e) => { setSiteType(e.target.value); setPage(1); }}
          placeholder="All site types"
          options={Object.entries(SITE_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          className="w-48"
        />
        <span className="ml-auto pb-1 text-[11px] text-ink-faint">{rows.length} sites</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={<MapPin className="h-5 w-5" />} title="No sites match" description="Try a different search term or site type." />
          </div>
        ) : (
          <>
            <Table>
              <THead columns={[{ label: "Site" }, { label: "Customer" }, { label: "Type" }, { label: "Location" }, { label: "Capacity" }, { label: "Equipment" }, { label: "Open tickets" }, { label: "AMC" }, { label: "" }]} />
              <TBody>
                {paged.map((r) => {
                  const open = expanded === r.s.id;
                  return (
                    <SiteRow
                      key={r.s.id}
                      row={r}
                      open={open}
                      onToggle={() => setExpanded(open ? null : r.s.id)}
                      onLogTicket={() => router.push("/oem/tickets/new")}
                      onCustomer={() => router.push(`/oem/customers/${r.s.customerId}`)}
                    />
                  );
                })}
              </TBody>
            </Table>
            <Pagination page={safePage} totalPages={totalPages} total={rows.length} onPage={setPage} pageSizeLabel={`${PAGE_SIZE} per page`} />
          </>
        )}
      </div>

      {uncovered.length > 0 && (
        <Card className="mt-4">
          <CardHeader
            title="Coverage gaps"
            description="Sites without an AMC contract are more likely to generate avoidable breakdown tickets."
            action={<Link href="/amc"><Button size="sm" variant="outline">AMC overview</Button></Link>}
          />
          <ul className="divide-y divide-line">
            {uncovered.slice(0, 5).map((r) => (
              <li key={r.s.id} className="flex flex-wrap items-center gap-2 py-2.5 text-[13px]">
                <button type="button" onClick={() => setExpanded(r.s.id)} className="min-w-0 flex-1 truncate text-left font-medium text-ink hover:text-brand-700">
                  {r.s.name}
                </button>
                <span className="text-[11px] text-ink-faint">{r.s.capacityKw} kW · {r.s.city}</span>
                <Link href="/amc" className="text-[12px] font-medium text-brand-700">Create AMC</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function SiteRow({
  row,
  open,
  onToggle,
  onLogTicket,
  onCustomer,
}: {
  row: {
    s: { id: string; name: string; customerId: string; siteType: string; address: string; city: string; state: string; pincode: string; capacityKw: number; installationDate: string; gps?: string };
    customer?: { name: string };
    equipment: { id: string; model: string; serialNumber: string; category: string; status: string }[];
    tickets: { id: string; ref: string; status: string; issue: { category: string } }[];
    open: { id: string }[];
    amc?: { id: string; ref: string; status: string };
  };
  open: boolean;
  onToggle: () => void;
  onLogTicket: () => void;
  onCustomer: () => void;
}) {
  return (
    <>
      <Tr onClick={onToggle} className={open ? "bg-brand-50/30" : undefined}>
        <Td>
          <span className="flex items-center gap-1.5 font-medium text-ink">
            {row.s.name}
            <ChevronDown className={`h-3.5 w-3.5 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
          </span>
        </Td>
        <Td><span className="text-[12px] text-ink-soft">{row.customer?.name ?? "—"}</span></Td>
        <Td><Badge tone="gray">{SITE_TYPE_LABELS[row.s.siteType] ?? row.s.siteType.replace(/_/g, " ")}</Badge></Td>
        <Td><span className="text-[12px] text-ink-soft">{row.s.city}<br /><span className="text-ink-faint">{row.s.state}</span></span></Td>
        <Td>{row.s.capacityKw} kW</Td>
        <Td>{row.equipment.length}</Td>
        <Td>{row.open.length ? <Badge tone="amber">{row.open.length} open</Badge> : <span className="text-[11px] text-ink-faint">None</span>}</Td>
        <Td>{row.amc ? <Badge tone={row.amc.status === "active" ? "green" : "amber"}>{AMC_STATUS_LABELS[row.amc.status]}</Badge> : <span className="text-[11px] text-ink-faint">Not covered</span>}</Td>
        <Td><span className="text-[11px] text-brand-700">{open ? "Hide" : "Details"}</span></Td>
      </Tr>
      {open && (
        <tr className="bg-surface-alt/50">
          <Td colSpan={9} className="px-4 py-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Site details</p>
                <p className="mt-1.5 text-[13px] leading-6 text-ink-soft">{row.s.address}<br />{row.s.city}, {row.s.state} {row.s.pincode}</p>
                <p className="mt-1 text-[11px] text-ink-faint">Installed {formatDate(row.s.installationDate)}{row.s.gps ? ` · GPS ${row.s.gps}` : ""}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onCustomer(); }}>Open customer</Button>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onLogTicket(); }}><TicketIcon className="h-3.5 w-3.5" aria-hidden /> Log ticket</Button>
                  {row.amc && (
                    <Link href={`/amc/${row.amc.id}`} onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost">AMC {row.amc.ref}</Button>
                    </Link>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Equipment ({row.equipment.length})</p>
                {row.equipment.length === 0 ? (
                  <p className="mt-1.5 text-[12px] text-ink-muted">No equipment recorded.</p>
                ) : (
                  <ul className="mt-1.5 space-y-1.5">
                    {row.equipment.map((e) => (
                      <li key={e.id} className="flex items-center gap-2 text-[12px]">
                        <Cpu className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                        <Link href={`/oem/products/${e.id}`} onClick={(ev) => ev.stopPropagation()} className="min-w-0 flex-1 truncate text-ink-soft hover:text-brand-700">
                          {e.model} · {e.serialNumber}
                        </Link>
                        <Badge tone={e.status === "operational" ? "green" : e.status === "faulty" ? "red" : e.status === "under_service" ? "amber" : "gray"}>{e.status.replace(/_/g, " ")}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Recent tickets ({row.tickets.length})</p>
                {row.tickets.length === 0 ? (
                  <p className="mt-1.5 text-[12px] text-ink-muted">No tickets at this site.</p>
                ) : (
                  <ul className="mt-1.5 space-y-1.5">
                    {row.tickets.slice(0, 4).map((t) => (
                      <li key={t.id} className="flex items-center gap-2 text-[12px]">
                        <Link href={`/oem/tickets/${t.id}`} onClick={(ev) => ev.stopPropagation()} className="font-mono text-[11px] text-brand-700 hover:underline">{t.ref}</Link>
                        <span className="min-w-0 flex-1 truncate text-ink-muted">{t.issue.category}</span>
                        <Badge tone={TICKET_STATUS_TONES[t.status as keyof typeof TICKET_STATUS_TONES]}>{TICKET_STATUS_LABELS[t.status as keyof typeof TICKET_STATUS_LABELS]}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
                {row.tickets.length > 0 && (
                  <Link href="/oem/tickets" onClick={(ev) => ev.stopPropagation()} className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-brand-700">
                    All tickets <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                )}
              </div>
            </div>
          </Td>
        </tr>
      )}
    </>
  );
}
