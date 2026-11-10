"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Cpu, Download, Layers, Plus, ShieldCheck, Wrench } from "lucide-react";
import { useMyOemId, useStore } from "@/lib/store";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { Pagination, SearchInput, Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { ProgressBar } from "@/components/charts";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { downloadCsv, formatDate, daysBetween, todayIso } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function ProductsPage() {
  const router = useRouter();
  const { state, toast } = useStore();
  const oemId = useMyOemId();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<"units" | "models">("units");
  const [page, setPage] = useState(1);

  const equipment = useMemo(
    () => state.equipment.filter((e) => (oemId ? e.oemId === oemId : true)),
    [state.equipment, oemId],
  );

  const units = useMemo(() => {
    const q = query.trim().toLowerCase();
    return equipment
      .filter((e) => {
        if (category && e.category !== category) return false;
        if (status && e.status !== status) return false;
        if (!q) return true;
        const site = state.sites.find((s) => s.id === e.siteId);
        const customer = state.customers.find((c) => c.id === site?.customerId);
        return (
          e.model.toLowerCase().includes(q) ||
          e.serialNumber.toLowerCase().includes(q) ||
          (site?.name ?? "").toLowerCase().includes(q) ||
          (customer?.name ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.model === b.model ? a.serialNumber.localeCompare(b.serialNumber) : a.model.localeCompare(b.model)));
  }, [equipment, category, status, query, state.sites, state.customers]);

  const models = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, { model: string; category: string; units: typeof equipment }>();
    for (const e of equipment) {
      if (category && e.category !== category) continue;
      if (status && e.status !== status) continue;
      if (q && !e.model.toLowerCase().includes(q)) continue;
      const entry = map.get(e.model) ?? { model: e.model, category: e.category, units: [] };
      entry.units.push(e);
      map.set(e.model, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.units.length - a.units.length);
  }, [equipment, category, status, query]);

  const totalPages = Math.max(1, Math.ceil(units.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = units.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const operational = equipment.filter((e) => e.status === "operational").length;
  const faulty = equipment.filter((e) => e.status === "faulty").length;
  const underService = equipment.filter((e) => e.status === "under_service").length;
  const warrantySoon = equipment.filter((e) => {
    const days = daysBetween(todayIso(), e.warrantyEndsOn);
    return days >= 0 && days <= 90;
  }).length;
  const outOfWarranty = equipment.filter((e) => daysBetween(todayIso(), e.warrantyEndsOn) < 0).length;

  const exportRows = () => {
    if (view === "models") {
      downloadCsv(
        "rayviq-product-models",
        models.map((m) => ({
          model: m.model,
          category: PRODUCT_CATEGORY_LABELS[m.category] ?? m.category,
          units: m.units.length,
          capacityKw: m.units.reduce((sum, u) => sum + u.capacityKw, 0),
          operational: m.units.filter((u) => u.status === "operational").length,
          faulty: m.units.filter((u) => u.status === "faulty").length,
          underService: m.units.filter((u) => u.status === "under_service").length,
        })),
      );
      return;
    }
    downloadCsv(
      "rayviq-equipment",
      units.map((e) => {
        const site = state.sites.find((s) => s.id === e.siteId);
        return {
          model: e.model,
          serial: e.serialNumber,
          category: e.category,
          capacityKw: e.capacityKw,
          site: site?.name ?? "",
          city: site?.city ?? "",
          firmware: e.firmware ?? "",
          installedOn: e.installationDate,
          warrantyEndsOn: e.warrantyEndsOn,
          status: e.status,
        };
      }),
    );
  };

  return (
    <div>
      <PageHeader
        title="Products & equipment"
        description="The installed base by unit and by model: firmware, warranty position and service status across every site."
        breadcrumbs={<Breadcrumbs />}
        actions={
          <>
            <Button variant="outline" onClick={exportRows}><Download className="h-4 w-4" aria-hidden /> Export</Button>
            <Button onClick={() => toast("Product registration is a demo action", { description: "Equipment registration would open here in production." })}>
              <Plus className="h-4 w-4" aria-hidden /> Register equipment
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Installed units" value={equipment.length} hint={`${models.length} product models`} icon={<Cpu className="h-4 w-4" />} tone="brand" />
        <StatCard label="Operational" value={`${equipment.length ? Math.round((operational / equipment.length) * 100) : 0}%`} hint={`${operational} of ${equipment.length} units`} icon={<ShieldCheck className="h-4 w-4" />} tone={operational === equipment.length ? "success" : "default"} />
        <StatCard label="Attention needed" value={faulty + underService} hint={`${faulty} faulty · ${underService} under service`} icon={<Wrench className="h-4 w-4" />} tone={faulty ? "danger" : underService ? "warning" : "success"} />
        <StatCard label="Warranty" value={`${warrantySoon} expiring`} hint={`${outOfWarranty} out of warranty`} icon={<ShieldCheck className="h-4 w-4" />} tone={outOfWarranty ? "warning" : "default"} />
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 pt-2">
          <Tabs
            tabs={[
              { key: "units", label: "By unit", count: units.length, icon: <Cpu className="h-3.5 w-3.5" /> },
              { key: "models", label: "By model", count: models.length, icon: <Layers className="h-3.5 w-3.5" /> },
            ]}
            active={view}
            onChange={(k) => { setView(k as "units" | "models"); setPage(1); }}
            className="border-b-0"
          />
          <span className="text-[11px] text-ink-faint">Warranty decisions remain with the OEM</span>
        </div>

        <div className="flex flex-wrap items-end gap-2 px-4 pt-4">
          <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search model, serial, site or customer…" className="w-full sm:w-80" />
          <Select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            placeholder="All categories"
            options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: PRODUCT_CATEGORY_LABELS[c] ?? c }))}
            className="w-48"
          />
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            placeholder="All statuses"
            options={[
              { value: "operational", label: "Operational" },
              { value: "faulty", label: "Faulty" },
              { value: "under_service", label: "Under service" },
              { value: "replaced", label: "Replaced" },
            ]}
            className="w-44"
          />
        </div>

        {view === "units" ? (
          units.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<Cpu className="h-5 w-5" />} title="No equipment matches" description="Try a different model, serial or status." />
            </div>
          ) : (
            <>
              <div className="mt-3">
                <Table>
                  <THead columns={[{ label: "Model" }, { label: "Serial" }, { label: "Site / customer" }, { label: "Category" }, { label: "Capacity" }, { label: "Firmware" }, { label: "Warranty ends" }, { label: "Status" }]} />
                  <TBody>
                    {paged.map((e) => {
                      const site = state.sites.find((s) => s.id === e.siteId);
                      const customer = state.customers.find((c) => c.id === site?.customerId);
                      const warrantyDays = daysBetween(todayIso(), e.warrantyEndsOn);
                      return (
                        <Tr key={e.id} onClick={() => router.push(`/oem/products/${e.id}`)}>
                          <Td><span className="font-medium text-ink">{e.model}</span></Td>
                          <Td><span className="font-mono text-[11px]">{e.serialNumber}</span></Td>
                          <Td>
                            <p className="text-[12px] text-ink-soft">{site?.name ?? "—"}</p>
                            <p className="text-[11px] text-ink-faint">{customer?.name ?? ""}{site ? ` · ${site.city}` : ""}</p>
                          </Td>
                          <Td><Badge tone="gray">{PRODUCT_CATEGORY_LABELS[e.category] ?? e.category}</Badge></Td>
                          <Td>{e.capacityKw} kW</Td>
                          <Td><span className="font-mono text-[11px] text-ink-muted">{e.firmware ?? "—"}</span></Td>
                          <Td>
                            <span className="text-[11px] text-ink-soft">{formatDate(e.warrantyEndsOn)}</span>
                            <span className={`block text-[10px] ${warrantyDays < 0 ? "text-danger-600" : warrantyDays <= 90 ? "text-warning-600" : "text-ink-faint"}`}>
                              {warrantyDays < 0 ? `${Math.abs(warrantyDays)}d expired` : `${warrantyDays}d left`}
                            </span>
                          </Td>
                          <Td><Badge tone={e.status === "operational" ? "green" : e.status === "faulty" ? "red" : e.status === "under_service" ? "amber" : "gray"}>{e.status.replace(/_/g, " ")}</Badge></Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
              <Pagination page={safePage} totalPages={totalPages} total={units.length} onPage={setPage} pageSizeLabel={`${PAGE_SIZE} per page`} />
            </>
          )
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {models.length === 0 ? (
              <div className="sm:col-span-2 xl:col-span-3">
                <EmptyState icon={<Layers className="h-5 w-5" />} title="No models match" description="Try a different model name or category." />
              </div>
            ) : (
              models.map((m) => {
                const healthy = m.units.filter((u) => u.status === "operational").length;
                const issue = m.units.length - healthy;
                return (
                  <div key={m.model} className="rounded-xl border border-line p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{m.model}</p>
                        <p className="text-[11px] text-ink-faint">{PRODUCT_CATEGORY_LABELS[m.category] ?? m.category}</p>
                      </div>
                      <Badge tone={issue ? "amber" : "green"}>{m.units.length} units</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-ink-muted">
                      <span>{healthy} healthy</span>
                      <span>{issue} need attention</span>
                    </div>
                    <ProgressBar value={m.units.length ? Math.round((healthy / m.units.length) * 100) : 0} tone={issue ? "warning" : "success"} className="mt-1.5" />
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                      <div><dt className="text-ink-faint">Capacity</dt><dd className="font-medium text-ink">{m.units.reduce((sum, u) => sum + u.capacityKw, 0)} kW</dd></div>
                      <div><dt className="text-ink-faint">Sites</dt><dd className="font-medium text-ink">{new Set(m.units.map((u) => u.siteId)).size}</dd></div>
                    </dl>
                    <button
                      type="button"
                      onClick={() => { setQuery(m.model); setView("units"); }}
                      className="mt-3 text-[12px] font-medium text-brand-700 hover:underline"
                    >
                      View all serials
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <CardHeader title="Product health notes" description="Demo observations derived from the current installed base." />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-surface-alt px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Most serviced model</p>
            <p className="mt-1 text-sm font-medium text-ink">
              {models.length
                ? models
                    .map((m) => ({ model: m.model, count: state.tickets.filter((t) => t.product.model === m.model).length }))
                    .sort((a, b) => b.count - a.count)[0].model
                : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface-alt px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Firmware behind</p>
            <p className="mt-1 text-sm font-medium text-ink">{equipment.filter((e) => e.firmware && e.firmware !== "v4.12.2").length} units</p>
          </div>
          <div className="rounded-lg border border-line bg-surface-alt px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Models in field</p>
            <p className="mt-1 text-sm font-medium text-ink">{models.length}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
