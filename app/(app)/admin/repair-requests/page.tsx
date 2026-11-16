"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  ShieldCheck,
  TimerReset,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { REPAIR_SERVICE_MODE_LABELS, REPAIR_STATUS_LABELS } from "@/lib/constants";
import { can } from "@/lib/permissions";
import { repairRequestKpis } from "@/lib/selectors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { SearchInput, Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RepairStatusBadge } from "@/components/repair/repair-status-badge";
import { downloadCsv, relativeTime } from "@/lib/utils";

/**
 * Platform oversight for inverter repair requests.
 *
 * Admins see every request across all repair companies, can filter the
 * pipeline and manage which companies are listed in the repair directory.
 */
export default function AdminRepairRequestsPage() {
  const router = useRouter();
  const { state, effectiveRole, setRepairCompanyStatus, toast } = useStore();
  const canManageCompanies = can(effectiveRole, "admin.repair.companies");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [company, setCompany] = useState("");
  const [companyTab, setCompanyTab] = useState<"requests" | "companies">("requests");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.repairRequests
      .filter((r) => {
        if (status && r.status !== status) return false;
        if (company && r.companyId !== company) return false;
        if (!q) return true;
        const customer = state.customers.find((c) => c.id === r.customerId);
        return (
          r.ref.toLowerCase().includes(q) ||
          r.problem.category.toLowerCase().includes(q) ||
          r.inverter.brand.toLowerCase().includes(q) ||
          r.contact.city.toLowerCase().includes(q) ||
          (customer?.name ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [state.repairRequests, state.customers, query, status, company]);

  const kpis = repairRequestKpis(state.repairRequests);
  const activeCompanies = state.partners.filter((p) => p.status === "active").length;

  const exportRows = () =>
    downloadCsv(
      "rayviq-repair-requests",
      rows.map((r) => ({
        ref: r.ref,
        company: state.partners.find((p) => p.id === r.companyId)?.name ?? r.companyId,
        customer: state.customers.find((c) => c.id === r.customerId)?.name ?? "",
        city: r.contact.city,
        brand: r.inverter.brand,
        model: r.inverter.model ?? "",
        problem: r.problem.category,
        serviceMode: REPAIR_SERVICE_MODE_LABELS[r.serviceMode ?? ""] ?? "",
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    );

  return (
    <div>
      <PageHeader
        title="Inverter repair requests"
        description="Platform-wide oversight of every inverter repair request — pipeline health, repair company coverage and directory management."
        breadcrumbs={<Breadcrumbs />}
        actions={
          <Button variant="outline" onClick={exportRows}>
            <Download className="h-4 w-4" aria-hidden /> Export
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="All requests"
          value={kpis.total}
          tone="brand"
          icon={<ClipboardList className="h-4 w-4" aria-hidden />}
          hint={`${kpis.active} open across the network`}
        />
        <StatCard
          label="Awaiting response"
          value={kpis.pending}
          tone={kpis.pending ? "warning" : "success"}
          icon={<TimerReset className="h-4 w-4" aria-hidden />}
          hint="Repair companies have not decided yet"
        />
        <StatCard
          label="Completed"
          value={kpis.completed}
          tone="success"
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
          hint={`${kpis.rejected} declined`}
        />
        <StatCard
          label="Avg. response"
          value={kpis.avgAcceptanceHours ? `${kpis.avgAcceptanceHours} h` : "—"}
          icon={<Clock3 className="h-4 w-4" aria-hidden />}
          hint={`${activeCompanies} repair companies active`}
        />
      </div>

      {/* -------- Tabs -------- */}
      <div className="mb-4 flex gap-1 border-b border-line" role="tablist">
        {(
          [
            { key: "requests", label: "All requests", count: state.repairRequests.length },
            { key: "companies", label: "Repair companies", count: state.partners.length },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={companyTab === t.key}
            onClick={() => setCompanyTab(t.key)}
            className={`relative flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
              companyTab === t.key ? "text-brand-700" : "text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
            <span
              className={`ml-0.5 rounded-full px-1.5 py-px text-[11px] font-semibold ${
                companyTab === t.key ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-ink-muted"
              }`}
            >
              {t.count}
            </span>
            {companyTab === t.key && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />
            )}
          </button>
        ))}
      </div>

      {companyTab === "requests" ? (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search ref, customer, brand or city…"
              className="w-full sm:w-80"
            />
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="All statuses"
              options={Object.entries(REPAIR_STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              className="w-44"
            />
            <Select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="All companies"
              options={state.partners.map((p) => ({ value: p.id, label: p.name }))}
              className="w-48"
            />
            <span className="ml-auto pb-1 text-[11px] text-ink-faint">{rows.length} requests</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            {rows.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={<ClipboardList className="h-5 w-5" />}
                  title="No repair requests match"
                  description="Try a different company, status or search term."
                />
              </div>
            ) : (
              <Table>
                <THead
                  columns={[
                    { label: "Request" },
                    { label: "Company" },
                    { label: "Customer" },
                    { label: "Inverter" },
                    { label: "Problem" },
                    { label: "Updated" },
                    { label: "Status" },
                  ]}
                />
                <TBody>
                  {rows.map((r) => {
                    const customer = state.customers.find((c) => c.id === r.customerId);
                    const partner = state.partners.find((p) => p.id === r.companyId);
                    return (
                      <Tr
                        key={r.id}
                        onClick={() => router.push(`/admin/repair-requests/${r.id}`)}
                      >
                        <Td>
                          <p className="font-mono text-[11.5px] font-medium text-ink">{r.ref}</p>
                          <p className="text-[11px] text-ink-faint">{r.contact.city}</p>
                        </Td>
                        <Td>
                          <span className="text-[12px] text-ink-soft">{partner?.name ?? r.companyId}</span>
                        </Td>
                        <Td>
                          <p className="text-[12.5px] text-ink-soft">
                            {customer?.name ?? r.contact.name}
                          </p>
                          <p className="text-[11px] text-ink-faint">{r.contact.phone}</p>
                        </Td>
                        <Td>
                          <p className="text-[12px] text-ink-soft">{r.inverter.brand}</p>
                          <p className="text-[11px] text-ink-faint">
                            {r.inverter.model ?? "—"}
                            {r.inverter.capacityKw ? ` · ${r.inverter.capacityKw} kW` : ""}
                          </p>
                        </Td>
                        <Td className="max-w-52">
                          <p className="truncate text-[12.5px] text-ink-soft">
                            {r.problem.category}
                          </p>
                        </Td>
                        <Td>
                          <span className="whitespace-nowrap text-[11.5px] text-ink-faint">
                            {relativeTime(r.updatedAt)}
                          </span>
                        </Td>
                        <Td>
                          <RepairStatusBadge status={r.status} />
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </div>
        </>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {state.partners.map((p) => {
            const companyRequests = state.repairRequests.filter((r) => r.companyId === p.id);
            const companyKpis = repairRequestKpis(companyRequests);
            const active = p.status === "active";
            return (
              <Card key={p.id}>
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-ink-faint" aria-hidden />
                      {p.name}
                    </span>
                  }
                  description={`${p.city}, ${p.state} · ${p.contactName} · ${p.phone}`}
                  action={
                    <Badge tone={active ? "green" : "gray"} dot>
                      {active ? "Listed" : "Suspended"}
                    </Badge>
                  }
                />
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    ["Requests", companyKpis.total],
                    ["Open", companyKpis.active],
                    ["Done", companyKpis.completed],
                    ["Declined", companyKpis.rejected],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg bg-surface-alt/60 px-2 py-2">
                      <p className="text-[15px] font-semibold text-ink">{value}</p>
                      <p className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(p.repairSpecialities ?? []).map((s) => (
                    <Badge key={s} tone="blue" className="text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <p className="flex items-center gap-1.5 text-[11.5px] text-ink-faint">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                    {active
                      ? "Visible to customers in the repair directory."
                      : "Hidden from the repair directory — existing requests stay visible."}
                  </p>
                  {canManageCompanies && (
                    <div className="ml-auto">
                      {active ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const ok = setRepairCompanyStatus(
                              p.id,
                              "inactive",
                              "Suspended from the repair directory by the platform team.",
                            );
                            if (ok) {
                              toast(`${p.name} suspended from the repair directory`, { tone: "info" });
                            }
                          }}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            const ok = setRepairCompanyStatus(
                              p.id,
                              "active",
                              "Re-listed in the repair directory by the platform team.",
                            );
                            if (ok) {
                              toast(`${p.name} is listed again`, { tone: "info" });
                            }
                          }}
                        >
                          <Wrench className="h-3.5 w-3.5" aria-hidden /> Re-list
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
