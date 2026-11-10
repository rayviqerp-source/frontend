"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Mail,
  MapPin,
  PauseCircle,
  Pencil,
  PlayCircle,
  Receipt,
  Ticket as TicketIcon,
  Users,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  OPEN_STATUSES,
  PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TONES,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { ProgressBar } from "@/components/charts";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatDate, relativeTime } from "@/lib/utils";

type TabKey = "overview" | "tickets" | "users" | "subscription";

const SUB_TONE: Record<string, "green" | "blue" | "red" | "gray"> = {
  active: "green",
  trial: "blue",
  past_due: "red",
  cancelled: "gray",
};

export default function AdminOemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state, updateOem, toast } = useStore();
  const [tab, setTab] = useState<TabKey>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const oem = state.oems.find((o) => o.id === params.id);
  const [form, setForm] = useState({
    name: oem?.name ?? "",
    shortName: oem?.shortName ?? "",
    industry: oem?.industry ?? "",
    hqCity: oem?.hqCity ?? "",
    hqState: oem?.hqState ?? "",
    contactName: oem?.contactName ?? "",
    contactEmail: oem?.contactEmail ?? "",
    contactPhone: oem?.contactPhone ?? "",
    seats: String(oem?.seats ?? 10),
  });

  if (!oem) {
    return (
      <EmptyState
        icon={<Building2 className="h-5 w-5" />}
        title="OEM not found"
        description="This organisation does not exist in the demo platform."
        action={<Link href="/admin/oems"><Button variant="outline">Back to OEMs</Button></Link>}
      />
    );
  }

  const subscription = state.subscriptions.find((s) => s.oemId === oem.id);
  const plan = state.plans.find((p) => p.id === oem.planId);
  const tickets = state.tickets
    .filter((t) => t.oemId === oem.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const open = tickets.filter((t) => OPEN_STATUSES.includes(t.status));
  const users = state.users.filter((u) => u.oemId === oem.id);
  const customers = state.customers.filter((c) =>
    state.sites.some((s) => s.customerId === c.id && state.equipment.some((e) => e.siteId === s.id && e.oemId === oem.id)),
  );
  const seatUsage = subscription && plan ? Math.round((subscription.seatsUsed / Math.max(plan.seats, 1)) * 100) : 0;

  const save = () => {
    updateOem(oem.id, {
      name: form.name.trim() || oem.name,
      shortName: form.shortName.trim() || oem.shortName,
      industry: form.industry.trim() || oem.industry,
      hqCity: form.hqCity.trim() || oem.hqCity,
      hqState: form.hqState.trim() || oem.hqState,
      contactName: form.contactName.trim() || oem.contactName,
      contactEmail: form.contactEmail.trim() || oem.contactEmail,
      contactPhone: form.contactPhone.trim() || oem.contactPhone,
      seats: Number(form.seats) || oem.seats,
    });
    setEditOpen(false);
  };

  const toggleStatus = () => {
    const next = oem.status === "active" ? "suspended" : "active";
    updateOem(oem.id, { status: next });
    toast(next === "active" ? "OEM reactivated" : "OEM suspended", {
      description: next === "active" ? "The tenant can sign in again." : "Tenant access is blocked in this demo.",
      tone: next === "active" ? "success" : "info",
    });
  };

  const tabs: { key: TabKey; label: string; count?: number; icon: ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <Building2 className="h-3.5 w-3.5" /> },
    { key: "tickets", label: "Tickets", count: tickets.length, icon: <TicketIcon className="h-3.5 w-3.5" /> },
    { key: "users", label: "Users", count: users.length, icon: <Users className="h-3.5 w-3.5" /> },
    { key: "subscription", label: "Subscription", icon: <CreditCard className="h-3.5 w-3.5" /> },
  ];

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {oem.name}
            <Badge tone={oem.status === "active" ? "green" : oem.status === "onboarding" ? "blue" : "red"} dot>{oem.status}</Badge>
          </span>
        }
        description={`${oem.id} · ${oem.industry} · ${oem.hqCity}, ${oem.hqState} · live since ${formatDate(oem.goLiveDate)}`}
        breadcrumbs={<Breadcrumbs />}
        actions={
          <>
            <Link href="/admin/oems"><Button variant="outline"><ArrowLeft className="h-4 w-4" aria-hidden /> Back</Button></Link>
            <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" aria-hidden /> Edit</Button>
            <Button variant={oem.status === "active" ? "danger" : "success"} onClick={toggleStatus}>
              {oem.status === "active" ? <><PauseCircle className="h-4 w-4" aria-hidden /> Suspend</> : <><PlayCircle className="h-4 w-4" aria-hidden /> Activate</>}
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open tickets" value={open.length} hint={`${tickets.length} lifetime`} icon={<TicketIcon className="h-4 w-4" />} tone={open.some((t) => t.priority === "critical") ? "danger" : open.length ? "warning" : "success"} />
        <StatCard label="Customers" value={customers.length} hint={`${state.sites.filter((s) => customers.some((c) => c.id === s.customerId)).length} installed sites`} icon={<Users className="h-4 w-4" />} tone="brand" />
        <StatCard label="Seats used" value={subscription ? `${subscription.seatsUsed}/${plan?.seats ?? oem.seats}` : `${oem.seats}`} hint={plan ? `${plan.name} plan` : "No plan"} icon={<Users className="h-4 w-4" />} tone={seatUsage > 90 ? "warning" : "default"} />
        <StatCard label="Subscription" value={(subscription?.status ?? oem.subscriptionStatus).replace(/_/g, " ")} hint={subscription ? `Renews ${formatDate(subscription.renewsOn)}` : "Not configured"} icon={<CreditCard className="h-4 w-4" />} tone={subscription?.status === "past_due" ? "danger" : "success"} />
      </div>

      <Card padded={false} className="overflow-hidden">
        <Tabs tabs={tabs} active={tab} onChange={(k) => setTab(k as TabKey)} className="px-3" />

        {tab === "overview" && (
          <div className="grid gap-5 p-5 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">Organisation profile</h3>
                <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Fact label="Legal name" value={oem.name} />
                  <Fact label="Short name" value={oem.shortName} />
                  <Fact label="Industry" value={oem.industry} />
                  <Fact label="Headquarters" value={`${oem.hqCity}, ${oem.hqState}`} />
                  <Fact label="Primary contact" value={oem.contactName} />
                  <Fact label="Website" value={oem.website ?? "Not provided"} />
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Email</dt>
                    <dd className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-soft"><Mail className="h-3.5 w-3.5" aria-hidden /> {oem.contactEmail}</dd>
                  </div>
                  <Fact label="Phone" value={oem.contactPhone} />
                </dl>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">Service regions</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {oem.serviceRegions.length === 0 ? (
                    <span className="text-[13px] text-ink-muted">No regions configured.</span>
                  ) : (
                    oem.serviceRegions.map((r) => <Badge key={r} tone="gray">{r}</Badge>)
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">Product categories</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {oem.productCategories.length === 0 ? (
                    <span className="text-[13px] text-ink-muted">No categories configured.</span>
                  ) : (
                    oem.productCategories.map((c) => <Badge key={c} tone="blue">{c.replace(/_/g, " ")}</Badge>)
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-line bg-surface-alt p-4">
                <h3 className="text-sm font-semibold text-ink">Subscription health</h3>
                {subscription && plan ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-ink">{plan.name}</span>
                      <Badge tone={SUB_TONE[subscription.status] ?? "gray"}>{subscription.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-ink-muted">
                        <span>Seat usage</span>
                        <span>{subscription.seatsUsed}/{plan.seats}</span>
                      </div>
                      <ProgressBar value={seatUsage} tone={seatUsage > 90 ? "warning" : "brand"} />
                    </div>
                    <dl className="space-y-1.5 text-[12px]">
                      <div className="flex justify-between"><dt className="text-ink-muted">Tickets this cycle</dt><dd className="font-medium text-ink">{subscription.ticketsThisCycle}{plan.ticketQuota ? ` / ${plan.ticketQuota}` : " / unlimited"}</dd></div>
                      <div className="flex justify-between"><dt className="text-ink-muted">Renews</dt><dd className="font-medium text-ink">{formatDate(subscription.renewsOn)}</dd></div>
                    </dl>
                  </div>
                ) : (
                  <p className="mt-2 text-[13px] text-ink-muted">No subscription record.</p>
                )}
              </div>
              <div className="rounded-xl border border-line bg-surface-alt p-4">
                <h3 className="text-sm font-semibold text-ink">Tenant footprint</h3>
                <dl className="mt-3 space-y-2 text-[13px]">
                  <div className="flex justify-between"><dt className="text-ink-muted">OEM users</dt><dd className="font-medium text-ink">{users.length}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-muted">Customers</dt><dd className="font-medium text-ink">{customers.length}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-muted">Engineers</dt><dd className="font-medium text-ink">{new Set(tickets.map((t) => t.assignedEngineerId).filter(Boolean)).size}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-muted">Created</dt><dd className="font-medium text-ink">{formatDate(oem.createdAt)}</dd></div>
                </dl>
              </div>
              <div className="rounded-xl border border-line bg-surface-alt p-4">
                <h3 className="text-sm font-semibold text-ink">Address</h3>
                <p className="mt-2 flex items-start gap-1.5 text-[13px] text-ink-muted"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {oem.hqCity}, {oem.hqState}, India</p>
              </div>
            </div>
          </div>
        )}

        {tab === "tickets" && (
          <div>
            {tickets.length === 0 ? (
              <div className="p-4"><EmptyState icon={<TicketIcon className="h-5 w-5" />} title="No tickets" description="No service tickets have been raised by this OEM." /></div>
            ) : (
              <Table>
                <THead columns={[{ label: "Ticket" }, { label: "Issue" }, { label: "Priority" }, { label: "Created" }, { label: "Status" }]} />
                <TBody>
                  {tickets.map((t) => (
                    <Tr key={t.id} onClick={() => router.push(`/oem/tickets/${t.id}`)}>
                      <Td><span className="font-mono text-[11px] font-medium text-ink">{t.ref}</span></Td>
                      <Td><span className="block max-w-64 truncate text-[12px] text-ink-soft">{t.issue.category} · {t.location.city}</span></Td>
                      <Td><Badge tone={t.priority === "critical" ? "red" : t.priority === "high" ? "amber" : t.priority === "medium" ? "blue" : "gray"}>{PRIORITY_LABELS[t.priority]}</Badge></Td>
                      <Td><span className="text-[11px] text-ink-faint">{relativeTime(t.createdAt)}</span></Td>
                      <Td><Badge tone={TICKET_STATUS_TONES[t.status]} dot>{TICKET_STATUS_LABELS[t.status]}</Badge></Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        )}

        {tab === "users" && (
          <div>
            {users.length === 0 ? (
              <div className="p-4"><EmptyState icon={<Users className="h-5 w-5" />} title="No users" description="This tenant has no user accounts in the demo." /></div>
            ) : (
              <Table>
                <THead columns={[{ label: "Name" }, { label: "Role" }, { label: "Email" }, { label: "Phone" }, { label: "Joined" }]} />
                <TBody>
                  {users.map((u) => (
                    <Tr key={u.id}>
                      <Td><span className="font-medium text-ink">{u.name}</span></Td>
                      <Td><Badge tone="gray">{u.role.replace(/_/g, " ")}</Badge></Td>
                      <Td><span className="text-[12px] text-ink-soft">{u.email}</span></Td>
                      <Td><span className="text-[12px] text-ink-soft">{u.phone ?? "—"}</span></Td>
                      <Td><span className="text-[11px] text-ink-faint">{formatDate(u.createdAt)}</span></Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        )}

        {tab === "subscription" && (
          <div className="space-y-4 p-5">
            {subscription && plan ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-line p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Plan</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{plan.name}</p>
                    <p className="mt-1 text-[11px] capitalize text-ink-muted">{plan.billingModel.replace(/_/g, " ")}</p>
                    <p className="mt-2 text-[11px] text-ink-faint">{plan.priceLabel}</p>
                  </div>
                  <div className="rounded-xl border border-line p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Usage this cycle</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{subscription.ticketsThisCycle} tickets</p>
                    <ProgressBar value={plan.ticketQuota ? (subscription.ticketsThisCycle / plan.ticketQuota) * 100 : 0} tone={plan.ticketQuota && subscription.ticketsThisCycle / plan.ticketQuota > 0.9 ? "warning" : "brand"} className="mt-2" />
                  </div>
                  <div className="rounded-xl border border-line p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Renewal</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{formatDate(subscription.renewsOn)}</p>
                    <p className="mt-1 text-[11px] text-ink-muted">Started {formatDate(subscription.startedOn)}</p>
                  </div>
                </div>
                <Card>
                  <CardHeader title="Invoices" description="Demo placeholders only — no real payments are processed." action={<Receipt className="h-4 w-4 text-ink-faint" aria-hidden />} />
                  {subscription.invoices.length === 0 ? (
                    <p className="text-[13px] text-ink-muted">No invoices issued yet.</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {subscription.invoices.map((inv) => (
                        <li key={inv.id} className="flex flex-wrap items-center gap-2 py-2.5 text-[13px]">
                          <span className="font-mono text-[11px] text-ink">{inv.number}</span>
                          <span className="text-[11px] text-ink-faint">issued {formatDate(inv.issuedOn)}</span>
                          <span className="ml-auto text-[12px] text-ink-soft">{inv.amountLabel}</span>
                          <Badge tone={inv.status === "paid" ? "green" : inv.status === "due" ? "amber" : inv.status === "overdue" ? "red" : "gray"}>{inv.status}</Badge>
                          <Button size="sm" variant="ghost" onClick={() => toast("Invoice download unavailable in demo", { description: "No real invoice PDF is stored." })}>Download</Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => toast("Billing changes need the commercial team", { description: "Plan changes are intentionally disabled in this demo." })}>Change plan</Button>
                  <Button variant="outline" onClick={() => toast("Invoice draft created (demo)", { description: "No real invoice or email was generated." })}>Create invoice draft</Button>
                </div>
              </>
            ) : (
              <EmptyState icon={<CreditCard className="h-5 w-5" />} title="No subscription" description="Attach a plan to start billing this tenant." />
            )}
          </div>
        )}
      </Card>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit OEM organisation"
        description="Changes are stored locally in this demo."
        size="lg"
        footer={<><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={save}>Save changes</Button></>}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Legal name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="sm:col-span-2" />
          <Input label="Short name" value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} />
          <Input label="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          <Input label="HQ city" value={form.hqCity} onChange={(e) => setForm({ ...form, hqCity: e.target.value })} />
          <Input label="HQ state" value={form.hqState} onChange={(e) => setForm({ ...form, hqState: e.target.value })} />
          <Input label="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          <Input label="Contact email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          <Input label="Contact phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
          <Input label="Contracted seats" type="number" min={1} value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
        </div>
      </Modal>
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
