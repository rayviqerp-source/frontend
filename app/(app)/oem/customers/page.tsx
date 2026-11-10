"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, MapPin, Plus, Users } from "lucide-react";
import { useMyOemId, useStore } from "@/lib/store";
import { OPEN_STATUSES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Pagination, SearchInput, Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { downloadCsv, formatDate } from "@/lib/utils";

const PAGE_SIZE = 10;

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  end_customer: "End customer",
  dealer: "Dealer",
  epc: "EPC",
};

export default function CustomersPage() {
  const router = useRouter();
  const { state, toast } = useStore();
  const oemId = useMyOemId();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");

  const customers = useMemo(() => {
    if (!oemId) return state.customers;
    return state.customers.filter((c) => {
      const hasSite = state.sites.some(
        (s) => s.customerId === c.id && state.equipment.some((e) => e.siteId === s.id && e.oemId === oemId),
      );
      const hasTicket = state.tickets.some((t) => t.customerId === c.id && t.oemId === oemId);
      return hasSite || hasTicket;
    });
  }, [state.customers, state.sites, state.equipment, state.tickets, oemId]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers
      .filter((c) => {
        if (type && c.type !== type) return false;
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q)
        );
      })
      .map((c) => {
        const sites = state.sites.filter((s) => s.customerId === c.id);
        const siteIds = sites.map((s) => s.id);
        const equipment = state.equipment.filter((e) => siteIds.includes(e.siteId) && (!oemId || e.oemId === oemId));
        const tickets = state.tickets.filter((t) => t.customerId === c.id && (!oemId || t.oemId === oemId));
        const open = tickets.filter((t) => OPEN_STATUSES.includes(t.status));
        const amc = state.amcContracts.filter((a) => a.customerId === c.id && (!oemId || a.oemId === oemId));
        const capacity = sites.reduce((sum, s) => sum + s.capacityKw, 0);
        return { c, sites, equipment, tickets, open, amc, capacity };
      })
      .sort((a, b) => b.tickets.length - a.tickets.length);
  }, [customers, type, query, state.sites, state.equipment, state.tickets, state.amcContracts, oemId]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const totalCapacity = rows.reduce((sum, r) => sum + r.capacity, 0);
  const withAmc = rows.filter((r) => r.amc.some((a) => a.status === "active")).length;

  const exportRows = () =>
    downloadCsv(
      "rayviq-customers",
      rows.map((r) => ({
        name: r.c.name,
        type: CUSTOMER_TYPE_LABELS[r.c.type] ?? r.c.type,
        phone: r.c.phone,
        city: r.c.city,
        state: r.c.state,
        sites: r.sites.length,
        capacityKw: r.capacity,
        equipment: r.equipment.length,
        openTickets: r.open.length,
        totalTickets: r.tickets.length,
        amcContracts: r.amc.length,
        createdAt: r.c.createdAt,
      })),
    );

  const submitCustomer = () => {
    if (!newName.trim()) {
      toast("Customer name is required", { tone: "error" });
      return;
    }
    toast("Customer creation is a demo action", {
      description: `${newName.trim()}${newCity.trim() ? ` · ${newCity.trim()}` : ""} was not saved. Connect the backend to persist customers.`,
    });
    setAddOpen(false);
    setNewName("");
    setNewCity("");
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Every end customer, dealer and EPC linked to your installed base. Open a customer to see sites, equipment, tickets and AMC coverage."
        breadcrumbs={<Breadcrumbs />}
        actions={
          <>
            <Button variant="outline" onClick={exportRows}>
              <Download className="h-4 w-4" aria-hidden /> Export
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden /> Add customer
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={rows.length} hint={`${rows.filter((r) => r.c.type === "dealer" || r.c.type === "epc").length} dealers / EPCs`} icon={<Users className="h-4 w-4" />} tone="brand" />
        <StatCard label="Installed sites" value={rows.reduce((sum, r) => sum + r.sites.length, 0)} hint="Mapped to this OEM" icon={<MapPin className="h-4 w-4" />} />
        <StatCard label="Installed capacity" value={`${(totalCapacity / 1000).toFixed(1)} MW`} hint={`${totalCapacity.toLocaleString("en-IN")} kW total`} icon={<MapPin className="h-4 w-4" />} tone="success" />
        <StatCard label="AMC covered" value={withAmc} hint={`${rows.length - withAmc} without an active contract`} icon={<Users className="h-4 w-4" />} tone={withAmc < rows.length ? "warning" : "success"} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search name, company, phone or city…" className="w-full sm:w-80" />
        <Select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          placeholder="All customer types"
          options={Object.entries(CUSTOMER_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          className="w-48"
        />
        <span className="ml-auto pb-1 text-[11px] text-ink-faint">{rows.length} customers</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title="No customers match"
              description="Try a different search term or customer type."
              action={<Button variant="outline" onClick={() => { setQuery(""); setType(""); }}>Clear filters</Button>}
            />
          </div>
        ) : (
          <>
            <Table>
              <THead columns={[{ label: "Customer" }, { label: "Type" }, { label: "Location" }, { label: "Sites" }, { label: "Capacity" }, { label: "Equipment" }, { label: "Open tickets" }, { label: "AMC" }, { label: "Since" }]} />
              <TBody>
                {paged.map((r) => (
                  <Tr key={r.c.id} onClick={() => router.push(`/oem/customers/${r.c.id}`)}>
                    <Td>
                      <p className="text-[13px] font-medium text-ink">{r.c.name}</p>
                      <p className="text-[11px] text-ink-faint">{r.c.phone}</p>
                    </Td>
                    <Td><Badge tone={r.c.type === "end_customer" ? "blue" : r.c.type === "dealer" ? "violet" : "cyan"}>{CUSTOMER_TYPE_LABELS[r.c.type] ?? r.c.type}</Badge></Td>
                    <Td><span className="text-[12px] text-ink-soft">{r.c.city}<br /><span className="text-ink-faint">{r.c.state}</span></span></Td>
                    <Td><span className="text-[13px] text-ink">{r.sites.length}</span></Td>
                    <Td><span className="text-[12px] text-ink-soft">{r.capacity.toLocaleString("en-IN")} kW</span></Td>
                    <Td><span className="text-[13px] text-ink-soft">{r.equipment.length}</span></Td>
                    <Td>
                      {r.open.length ? (
                        <Badge tone={r.open.some((t) => t.priority === "critical") ? "red" : "amber"}>{r.open.length} open</Badge>
                      ) : (
                        <span className="text-[11px] text-ink-faint">None</span>
                      )}
                    </Td>
                    <Td>
                      {r.amc.length ? (
                        <Badge tone={r.amc.some((a) => a.status === "active") ? "green" : "amber"}>{r.amc.length} contract{r.amc.length === 1 ? "" : "s"}</Badge>
                      ) : (
                        <span className="text-[11px] text-ink-faint">Not covered</span>
                      )}
                    </Td>
                    <Td><span className="text-[11px] text-ink-faint">{formatDate(r.c.createdAt)}</span></Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={safePage} totalPages={totalPages} total={rows.length} onPage={setPage} pageSizeLabel={`${PAGE_SIZE} per page`} />
          </>
        )}
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add customer"
        description="Create a customer record for this demo. Records are not persisted to a backend."
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitCustomer}>Add customer</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Customer name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Sunrise Textiles Pvt Ltd" required />
          <Input label="City" value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="e.g. Jaipur" />
        </div>
      </Modal>
    </div>
  );
}
