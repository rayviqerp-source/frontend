"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ClipboardList,
  Eye,
  EyeOff,
  Laptop,
  LogOut,
  MapPin,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatDate, relativeTime } from "@/lib/utils";
import { PageHeader, Card, CardHeader, StatCard } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Table, TBody, Td, THead, Tr } from "@/components/ui/table";

export default function CustomerPortalPage() {
  const { state, portalLogin, portalLogout, toast } = useStore();
  const [selected, setSelected] = useState("");
  const [showPhone, setShowPhone] = useState(false);

  const sessionIds = state.portalCustomerIds;
  const sessionCustomers = state.customers.filter((c) => sessionIds.includes(c.id));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Customer / Dealer portal (future-ready demo)"
        description="A read-only self-service view for end customers and dealers — track tickets for their own sites and see AMC status. This is a preview of a Phase-10 module, running entirely on local mock data."
        actions={
          sessionCustomers.length > 0 ? (
            <div className="flex items-center gap-2">
              <Link href="/customer-portal/book">
                <Button>
                  <Wrench className="h-4 w-4" /> Book an engineer
                </Button>
              </Link>
              <Button variant="outline" onClick={() => { portalLogout(); toast("Portal session ended", { tone: "info" }); }}>
                <LogOut className="h-4 w-4" /> End portal session
              </Button>
            </div>
          ) : undefined
        }
      />

      {sessionCustomers.length === 0 ? (
        <Card className="p-6">
          <CardHeader
            title="Portal sign-in (demo)"
            description="No OTP or password is requested — pick a customer to preview their portal. Real deployments verify identity via OTP/email magic link."
          />
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Choose a customer</span>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="">Select…</option>
                {state.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.company ?? c.type} ({c.city})
                  </option>
                ))}
              </select>
            </label>
            <Button
              disabled={!selected}
              onClick={() => {
                portalLogin(selected);
                const c = state.customers.find((x) => x.id === selected);
                toast(`Signed in as ${c?.name}`, { tone: "success" });
              }}
            >
              <Laptop className="h-4 w-4" /> Enter portal
            </Button>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink-faint">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Demo only: the customer portal sees only tickets, sites and AMC contracts tied to the
            selected customer — scoped in a real backend by verified identity.
          </p>
        </Card>
      ) : (
        sessionCustomers.map((customer) => {
          const sites = state.sites.filter((s) => s.customerId === customer.id);
          const siteIds = new Set(sites.map((s) => s.id));
          const tickets = state.tickets.filter((t) => t.customerId === customer.id || siteIds.has(t.siteId));
          const contracts = state.amcContracts.filter((c) => c.customerId === customer.id);
          const open = tickets.filter((t) => t.status !== "closed" && t.status !== "completed");

          return (
            <div key={customer.id} className="space-y-4">
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-ink">{customer.name}</h2>
                      <Badge tone="blue">{customer.type.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="mt-1 text-[13px] text-ink-muted">
                      {customer.company ? `${customer.company} · ` : ""}
                      {customer.city}, {customer.state}
                    </p>
                  </div>
                  <div className="text-right text-[13px]">
                    <p className="text-ink-faint">Contact</p>
                    <p className="font-medium text-ink">
                      {showPhone ? customer.phone : customer.phone.replace(/\d{5}$/, "•••••")}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPhone((v) => !v)}
                      className="mt-0.5 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                    >
                      {showPhone ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showPhone ? "hide" : "reveal"}
                    </button>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard label="Total tickets" value={tickets.length} hint="Across your sites" icon={<ClipboardList className="h-4 w-4" />} />
                <StatCard label="Open now" value={open.length} hint="Being worked on" icon={<ArrowUpRight className="h-4 w-4" />} tone={open.length ? "warning" : "success"} />
                <StatCard label="Sites" value={sites.length} hint={`${sites.reduce((a, s) => a + s.capacityKw, 0)} kW total`} icon={<MapPin className="h-4 w-4" />} />
                <StatCard label="AMC contracts" value={contracts.length} hint={`${contracts.filter((c) => c.status === "active").length} active`} icon={<ClipboardList className="h-4 w-4" />} />
              </div>

              <Card padded={false}>
                <div className="px-5 pt-5">
                  <CardHeader title="Your service tickets" description="Status updates in near real time (demo data)." />
                </div>
                <Table>
                  <THead
                    columns={[
                      { label: "Ticket" },
                      { label: "Issue" },
                      { label: "Status" },
                      { label: "Site" },
                      { label: "Updated" },
                    ]}
                  />
                  <TBody>
                    {tickets.map((t) => {
                      const site = state.sites.find((s) => s.id === t.siteId);
                      return (
                        <Tr key={t.id}>
                          <Td>
                            <Link href={`/customer-portal/bookings/${t.id}`} className="font-mono text-xs font-medium text-brand-700 hover:underline">
                              {t.ref}
                            </Link>
                          </Td>
                          <Td>{t.issue.category}</Td>
                          <Td>
                            <StatusBadge status={t.status} />
                          </Td>
                          <Td>{site?.name ?? "—"}</Td>
                          <Td className="whitespace-nowrap text-xs">{relativeTime(t.updatedAt)}</Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
                {tickets.length === 0 && (
                  <div className="p-5">
                    <EmptyState
                      title="No tickets yet"
                      description="Tickets logged for your sites will show here."
                      action={<Link href="/customer-portal/book"><Button variant="outline">Book an engineer</Button></Link>}
                    />
                  </div>
                )}
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Your sites" />
                  <ul className="space-y-2.5">
                    {sites.map((s) => (
                      <li key={s.id} className="rounded-lg border border-line bg-surface-alt/50 px-3.5 py-3">
                        <p className="text-sm font-medium text-ink">{s.name}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                          <MapPin className="h-3 w-3" /> {s.city} · {s.capacityKw} kW ·{" "}
                          {s.siteType.replace(/_/g, " ")}
                        </p>
                      </li>
                    ))}
                    {sites.length === 0 && <li className="text-[13px] text-ink-muted">No sites.</li>}
                  </ul>
                </Card>
                <Card>
                  <CardHeader title="AMC coverage" />
                  <ul className="space-y-2.5">
                    {contracts.map((c) => (
                      <li key={c.id} className="rounded-lg border border-line bg-surface-alt/50 px-3.5 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono text-sm font-medium text-brand-700">{c.ref}</p>
                          <Badge tone={c.status === "active" ? "green" : "amber"}>{c.status.replace(/_/g, " ")}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-ink-muted">
                          {c.planName} · valid till {formatDate(c.endsOn)}
                        </p>
                      </li>
                    ))}
                    {contracts.length === 0 && (
                      <li className="text-[13px] text-ink-muted">No active AMC coverage.</li>
                    )}
                  </ul>
                </Card>
              </div>

              <p className="text-center text-xs text-ink-faint">
                Want to explore the full experience?{" "}
                <Link href="/dashboard" className="font-medium text-brand-600 hover:underline">
                  Back to workspace
                </Link>
              </p>
            </div>
          );
        })
      )}
    </div>
  );
}
