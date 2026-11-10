"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, ClipboardList, Download, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";
import { AMC_STATUS_LABELS, MAINTENANCE_STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { Pagination, SearchInput, Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { downloadCsv, formatDate } from "@/lib/utils";

const PAGE_SIZE = 12;

export default function AdminAmcPage() {
  const router = useRouter();
  const { state } = useStore();
  const [tab, setTab] = useState<"contracts" | "visits">("contracts");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [oem, setOem] = useState("");
  const [page, setPage] = useState(1);

  const contracts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.amcContracts
      .filter((c) => {
        if (status && c.status !== status) return false;
        if (oem && c.oemId !== oem) return false;
        if (!q) return true;
        const site = state.sites.find((s) => s.id === c.siteId);
        const customer = state.customers.find((x) => x.id === c.customerId);
        return c.ref.toLowerCase().includes(q) || c.planName.toLowerCase().includes(q) || (site?.name ?? "").toLowerCase().includes(q) || (customer?.name ?? "").toLowerCase().includes(q);
      })
      .map((c) => {
        const site = state.sites.find((s) => s.id === c.siteId);
        const customer = state.customers.find((x) => x.id === c.customerId);
        const visits = state.maintenanceVisits.filter((v) => v.amcId === c.id);
        const next = visits.filter((v) => v.status !== "review_completed" && v.status !== "maintenance_completed").sort((a, b) => (a.dueOn < b.dueOn ? -1 : 1))[0];
        return { c, site, customer, visits, next };
      })
      .sort((a, b) => (a.c.endsOn < b.c.endsOn ? -1 : 1));
  }, [state.amcContracts, state.sites, state.customers, state.maintenanceVisits, query, status, oem]);

  const visits = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.maintenanceVisits
      .filter((v) => v.status !== "review_completed" && v.status !== "maintenance_completed")
      .map((v) => {
        const contract = state.amcContracts.find((c) => c.id === v.amcId);
        const site = state.sites.find((s) => s.id === contract?.siteId);
        const customer = state.customers.find((c) => c.id === contract?.customerId);
        const engineer = state.engineers.find((e) => e.id === v.engineerId);
        return { v, contract, site, customer, engineer };
      })
      .filter((r) => {
        if (oem && r.contract?.oemId !== oem) return false;
        if (!q) return true;
        return (r.contract?.ref ?? "").toLowerCase().includes(q) || (r.site?.name ?? "").toLowerCase().includes(q) || (r.customer?.name ?? "").toLowerCase().includes(q);
      })
      .sort((a, b) => (a.v.dueOn < b.v.dueOn ? -1 : 1));
  }, [state.maintenanceVisits, state.amcContracts, state.sites, state.customers, state.engineers, query, oem]);

  const totalPages = Math.max(1, Math.ceil((tab === "contracts" ? contracts.length : visits.length) / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedContracts = contracts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pagedVisits = visits.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const active = state.amcContracts.filter((c) => c.status === "active").length;
  const expiring = state.amcContracts.filter((c) => c.status === "expiring" || c.status === "renewal_due").length;
  const dueVisits = state.maintenanceVisits.filter((v) => v.status === "maintenance_due" || v.status === "visit_planned" || v.status === "engineer_assigned").length;
  const completedVisits = state.maintenanceVisits.filter((v) => v.status === "review_completed" || v.status === "maintenance_completed").length;

  const exportContracts = () =>
    downloadCsv(
      "rayviq-amc-operations",
      contracts.map((r) => ({
        ref: r.c.ref,
        oem: state.oems.find((o) => o.id === r.c.oemId)?.name ?? r.c.oemId,
        plan: r.c.planName,
        customer: r.customer?.name ?? "",
        site: r.site?.name ?? "",
        status: r.c.status,
        startsOn: r.c.startsOn,
        endsOn: r.c.endsOn,
        frequency: r.c.serviceFrequency,
        responseHours: r.c.coverage.responseHours,
        nextVisit: r.next?.dueOn ?? "",
      })),
    );

  const tabs: { key: "contracts" | "visits"; label: string; count: number; icon: ReactNode }[] = [
    { key: "contracts", label: "Contracts", count: state.amcContracts.length, icon: <ClipboardList className="h-3.5 w-3.5" /> },
    { key: "visits", label: "Visits due", count: visits.length, icon: <CalendarClock className="h-3.5 w-3.5" /> },
  ];

  return (
    <div>
      <PageHeader
        title="AMC operations"
        description="Cross-tenant view of preventive maintenance contracts, renewal risk and outstanding visits. Contract terms are owned by each OEM."
        breadcrumbs={<Breadcrumbs />}
        actions={<Button variant="outline" onClick={exportContracts}><Download className="h-4 w-4" aria-hidden /> Export</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Contracts" value={state.amcContracts.length} hint={`${active} active · ${expiring} expiring or renewal due`} icon={<ClipboardList className="h-4 w-4" />} tone="brand" />
        <StatCard label="Renewal risk" value={expiring} hint="Needs OEM follow-up" icon={<RefreshCw className="h-4 w-4" />} tone={expiring ? "warning" : "success"} />
        <StatCard label="Visits due" value={dueVisits} hint="Preventive maintenance" icon={<CalendarClock className="h-4 w-4" />} tone={dueVisits ? "warning" : "success"} />
        <StatCard label="Visits completed" value={completedVisits} hint={`${state.maintenanceVisits.length} scheduled lifetime`} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search contract, plan, site or customer…" className="w-full sm:w-80" />
        <Select value={oem} onChange={(e) => { setOem(e.target.value); setPage(1); }} placeholder="All OEMs" options={state.oems.map((o) => ({ value: o.id, label: o.shortName }))} className="w-40" />
        {tab === "contracts" && (
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All statuses" options={Object.entries(AMC_STATUS_LABELS).map(([value, label]) => ({ value, label }))} className="w-44" />
        )}
        <span className="ml-auto pb-1 text-[11px] text-ink-faint">{tab === "contracts" ? contracts.length : visits.length} records</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <Tabs tabs={tabs} active={tab} onChange={(k) => { setTab(k as "contracts" | "visits"); setPage(1); }} className="px-3" />

        {tab === "contracts" ? (
          contracts.length === 0 ? (
            <div className="p-4"><EmptyState icon={<ClipboardList className="h-5 w-5" />} title="No contracts match" description="Try a different OEM or status." /></div>
          ) : (
            <>
              <Table>
                <THead columns={[{ label: "Contract" }, { label: "OEM" }, { label: "Customer / site" }, { label: "Plan" }, { label: "Period" }, { label: "Next visit" }, { label: "Status" }]} />
                <TBody>
                  {pagedContracts.map((r) => (
                    <Tr key={r.c.id} onClick={() => router.push(`/amc/${r.c.id}`)}>
                      <Td><span className="font-mono text-[11px] font-medium text-ink">{r.c.ref}</span></Td>
                      <Td><span className="text-[12px] text-ink-soft">{state.oems.find((o) => o.id === r.c.oemId)?.shortName ?? r.c.oemId}</span></Td>
                      <Td>
                        <p className="text-[12px] text-ink-soft">{r.customer?.name ?? "—"}</p>
                        <p className="text-[11px] text-ink-faint">{r.site?.name ?? "—"} · {r.site?.city}</p>
                      </Td>
                      <Td><span className="block max-w-44 truncate text-[12px] text-ink-soft">{r.c.planName}</span></Td>
                      <Td><span className="text-[11px] text-ink-soft">{formatDate(r.c.startsOn)}<br />{formatDate(r.c.endsOn)}</span></Td>
                      <Td>{r.next ? <span className="text-[11px] text-ink-soft">{formatDate(r.next.dueOn)}<br /><span className="text-ink-faint">{MAINTENANCE_STATUS_LABELS[r.next.status]}</span></span> : <span className="text-[11px] text-ink-faint">None scheduled</span>}</Td>
                      <Td><Badge tone={r.c.status === "active" ? "green" : r.c.status === "expired" ? "red" : "amber"}>{AMC_STATUS_LABELS[r.c.status]}</Badge></Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
              <Pagination page={safePage} totalPages={totalPages} total={contracts.length} onPage={setPage} pageSizeLabel={`${PAGE_SIZE} per page`} />
            </>
          )
        ) : visits.length === 0 ? (
          <div className="p-4"><EmptyState icon={<CalendarClock className="h-5 w-5" />} title="No visits outstanding" description="All preventive visits are completed and reviewed." /></div>
        ) : (
          <>
            <Table>
              <THead columns={[{ label: "Due" }, { label: "Contract" }, { label: "Customer / site" }, { label: "Engineer" }, { label: "Checklist" }, { label: "Status" }]} />
              <TBody>
                {pagedVisits.map((r) => (
                  <Tr key={r.v.id} onClick={() => router.push(`/amc/${r.v.amcId}`)}>
                    <Td><span className="text-[12px] font-medium text-ink">{formatDate(r.v.dueOn)}</span></Td>
                    <Td><span className="font-mono text-[11px] text-ink-soft">{r.contract?.ref ?? r.v.amcId}</span></Td>
                    <Td>
                      <p className="text-[12px] text-ink-soft">{r.customer?.name ?? "—"}</p>
                      <p className="text-[11px] text-ink-faint">{r.site?.name ?? "—"}</p>
                    </Td>
                    <Td><span className="text-[12px] text-ink-soft">{r.engineer?.name ?? "Unassigned"}</span></Td>
                    <Td><span className="text-[12px] text-ink-soft">{r.v.checklist.filter((c) => c.done).length}/{r.v.checklist.length}</span></Td>
                    <Td><Badge tone={r.v.status === "maintenance_due" ? "amber" : r.v.status === "visit_planned" ? "blue" : "cyan"}>{MAINTENANCE_STATUS_LABELS[r.v.status]}</Badge></Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={safePage} totalPages={totalPages} total={visits.length} onPage={setPage} pageSizeLabel={`${PAGE_SIZE} per page`} />
          </>
        )}
      </div>
    </div>
  );
}
