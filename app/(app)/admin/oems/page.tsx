"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Download, Plus, ShieldCheck, Users } from "lucide-react";
import { useStore } from "@/lib/store";
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

const SUB_TONE: Record<string, "green" | "blue" | "red" | "gray"> = {
  active: "green",
  trial: "blue",
  past_due: "red",
  cancelled: "gray",
};

export default function AdminOemsPage() {
  const router = useRouter();
  const { state, addOem, toast } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", shortName: "", industry: "", hqCity: "", hqState: "", contactName: "", contactEmail: "", contactPhone: "" });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.oems
      .filter((o) => {
        if (status && o.status !== status) return false;
        if (!q) return true;
        return (
          o.name.toLowerCase().includes(q) ||
          o.shortName.toLowerCase().includes(q) ||
          o.hqCity.toLowerCase().includes(q) ||
          o.industry.toLowerCase().includes(q)
        );
      })
      .map((o) => {
        const subscription = state.subscriptions.find((s) => s.oemId === o.id);
        const plan = state.plans.find((p) => p.id === o.planId);
        const tickets = state.tickets.filter((t) => t.oemId === o.id);
        const users = state.users.filter((u) => u.oemId === o.id);
        const openTickets = tickets.filter((t) => t.status !== "completed" && t.status !== "closed");
        return { o, subscription, plan, tickets, users, openTickets };
      })
      .sort((a, b) => a.o.name.localeCompare(b.o.name));
  }, [state.oems, state.subscriptions, state.plans, state.tickets, state.users, query, status]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const active = rows.filter((r) => r.o.status === "active").length;
  const trial = rows.filter((r) => r.subscription?.status === "trial" || r.o.status === "onboarding").length;
  const seats = rows.reduce((sum, r) => sum + (r.subscription?.seatsUsed ?? 0), 0);

  const exportRows = () =>
    downloadCsv(
      "rayviq-oems",
      rows.map((r) => ({
        id: r.o.id,
        name: r.o.name,
        shortName: r.o.shortName,
        status: r.o.status,
        industry: r.o.industry,
        hq: `${r.o.hqCity}, ${r.o.hqState}`,
        plan: r.plan?.name ?? r.o.planId,
        subscription: r.subscription?.status ?? r.o.subscriptionStatus,
        seatsUsed: r.subscription?.seatsUsed ?? 0,
        tickets: r.tickets.length,
        openTickets: r.openTickets.length,
        goLive: r.o.goLiveDate,
      })),
    );

  const submit = () => {
    if (!form.name.trim()) {
      toast("OEM name is required", { tone: "error" });
      return;
    }
    addOem({
      name: form.name.trim(),
      shortName: form.shortName.trim() || undefined,
      industry: form.industry.trim() || undefined,
      hqCity: form.hqCity.trim() || undefined,
      hqState: form.hqState.trim() || undefined,
      contactName: form.contactName.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
    });
    setAddOpen(false);
    setForm({ name: "", shortName: "", industry: "", hqCity: "", hqState: "", contactName: "", contactEmail: "", contactPhone: "" });
  };

  return (
    <div>
      <PageHeader
        title="OEM organisations"
        description="Tenant configuration for every inverter manufacturer on the platform: subscription, seats, regions and live service activity."
        breadcrumbs={<Breadcrumbs />}
        actions={
          <>
            <Button variant="outline" onClick={exportRows}><Download className="h-4 w-4" aria-hidden /> Export</Button>
            <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" aria-hidden /> Add OEM</Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="OEM organisations" value={rows.length} hint={`${active} active · ${trial} trial / onboarding`} icon={<Building2 className="h-4 w-4" />} tone="brand" />
        <StatCard label="Active subscriptions" value={rows.filter((r) => r.subscription?.status === "active").length} hint={`${rows.filter((r) => r.subscription?.status === "past_due").length} past due`} icon={<ShieldCheck className="h-4 w-4" />} tone="success" />
        <StatCard label="Seats in use" value={seats} hint={`${rows.reduce((sum, r) => sum + r.o.seats, 0)} contracted`} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Platform tickets" value={rows.reduce((sum, r) => sum + r.tickets.length, 0)} hint={`${rows.reduce((sum, r) => sum + r.openTickets.length, 0)} currently open`} icon={<Building2 className="h-4 w-4" />} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search OEM, industry or city…" className="w-full sm:w-80" />
        <Select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          placeholder="All tenant statuses"
          options={[
            { value: "active", label: "Active" },
            { value: "onboarding", label: "Onboarding" },
            { value: "suspended", label: "Suspended" },
          ]}
          className="w-48"
        />
        <span className="ml-auto pb-1 text-[11px] text-ink-faint">{rows.length} organisations</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={<Building2 className="h-5 w-5" />} title="No OEMs match" description="Try a different name, industry or tenant status." />
          </div>
        ) : (
          <>
            <Table>
              <THead columns={[{ label: "OEM" }, { label: "Status" }, { label: "HQ / industry" }, { label: "Plan" }, { label: "Seats" }, { label: "Tickets" }, { label: "Go live" }, { label: "Subscription" }]} />
              <TBody>
                {paged.map((r) => (
                  <Tr key={r.o.id} onClick={() => router.push(`/admin/oems/${r.o.id}`)}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-white" style={{ backgroundColor: r.o.logoColor }}>
                          {r.o.shortName.slice(0, 2).toUpperCase()}
                        </span>
                        <span>
                          <span className="block text-[13px] font-medium text-ink">{r.o.name}</span>
                          <span className="block font-mono text-[10px] text-ink-faint">{r.o.id}</span>
                        </span>
                      </div>
                    </Td>
                    <Td><Badge tone={r.o.status === "active" ? "green" : r.o.status === "onboarding" ? "blue" : "red"} dot>{r.o.status}</Badge></Td>
                    <Td><span className="text-[12px] text-ink-soft">{r.o.hqCity}, {r.o.hqState}<br /><span className="text-[11px] text-ink-faint">{r.o.industry}</span></span></Td>
                    <Td><span className="text-[12px] text-ink-soft">{r.plan?.name ?? r.o.planId}</span></Td>
                    <Td><span className="text-[12px] text-ink-soft">{r.subscription?.seatsUsed ?? 0}/{r.o.seats}</span></Td>
                    <Td>
                      <span className="text-[12px] text-ink-soft">{r.tickets.length}</span>
                      {r.openTickets.length > 0 && <span className="block text-[10px] text-warning-600">{r.openTickets.length} open</span>}
                    </Td>
                    <Td><span className="text-[11px] text-ink-faint">{formatDate(r.o.goLiveDate)}</span></Td>
                    <Td><Badge tone={SUB_TONE[r.subscription?.status ?? r.o.subscriptionStatus] ?? "gray"}>{(r.subscription?.status ?? r.o.subscriptionStatus).replace(/_/g, " ")}</Badge></Td>
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
        title="Add OEM organisation"
        description="Create a tenant record. The demo store persists it locally in this browser."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Create OEM</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Legal name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Helios Solar Systems Pvt Ltd" className="sm:col-span-2" />
          <Input label="Short name" value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} placeholder="Helios" />
          <Input label="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Solar inverter manufacturing" />
          <Input label="HQ city" value={form.hqCity} onChange={(e) => setForm({ ...form, hqCity: e.target.value })} placeholder="Ahmedabad" />
          <Input label="HQ state" value={form.hqState} onChange={(e) => setForm({ ...form, hqState: e.target.value })} placeholder="Gujarat" />
          <Input label="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          <Input label="Contact email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          <Input label="Contact phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="sm:col-span-2" />
        </div>
        <p className="mt-3 text-[11px] text-ink-faint">Demo only — no real tenant provisioning or billing is triggered.</p>
      </Modal>
    </div>
  );
}
