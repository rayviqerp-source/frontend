"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Download, Receipt, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, StatCard } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { downloadCsv, formatDate, formatDate as fmt } from "@/lib/utils";

const SUB_TONES: Record<string, "green" | "blue" | "red" | "gray"> = {
  active: "green",
  trial: "blue",
  past_due: "red",
  cancelled: "gray",
};

const INVOICE_TONES: Record<string, "green" | "amber" | "red" | "gray"> = {
  paid: "green",
  due: "amber",
  overdue: "red",
  draft: "gray",
};

export default function AdminSubscriptionsPage() {
  const { state, updateOem } = useStore();
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      state.subscriptions
        .map((s) => ({
          s,
          oem: state.oems.find((o) => o.id === s.oemId),
          plan: state.plans.find((p) => p.id === s.planId),
        }))
        .filter((r) => r.oem)
        .sort((a, b) => (a.oem!.name.localeCompare(b.oem!.name))),
    [state],
  );

  const edit = editId ? rows.find((r) => r.s.id === editId) ?? null : null;
  const detail = detailId ? rows.find((r) => r.s.id === detailId) ?? null : null;

  const active = rows.filter((r) => r.s.status === "active").length;
  const pastDue = rows.filter((r) => r.s.status === "past_due").length;
  const seatsUsed = rows.reduce((sum, r) => sum + r.s.seatsUsed, 0);
  const ticketsThisCycle = rows.reduce((sum, r) => sum + r.s.ticketsThisCycle, 0);

  return (
    <div>
      <PageHeader
        title="Commercial & billing"
        description="Subscription plans, seat and ticket consumption, and invoice history per organisation. Demo figures only."
        breadcrumbs={<Breadcrumbs />}
        actions={
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                "rayviq-subscriptions",
                rows.map((r) => ({
                  oem: r.oem!.name,
                  plan: r.plan?.name ?? r.s.planId,
                  status: r.s.status,
                  startedOn: r.s.startedOn,
                  renewsOn: r.s.renewsOn,
                  seatsUsed: r.s.seatsUsed,
                  ticketsThisCycle: r.s.ticketsThisCycle,
                })),
              )
            }
          >
            <Download className="h-4 w-4" aria-hidden /> Export
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active subscriptions" value={active} tone="brand" icon={<CreditCard className="h-4 w-4" aria-hidden />} />
        <StatCard label="Past due" value={pastDue} tone={pastDue ? "danger" : "default"} icon={<Receipt className="h-4 w-4" aria-hidden />} />
        <StatCard label="Seats in use" value={seatsUsed} icon={<Users className="h-4 w-4" aria-hidden />} />
        <StatCard label="Tickets this cycle" value={ticketsThisCycle} icon={<Receipt className="h-4 w-4" aria-hidden />} />
      </div>

      {/* Plans */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {state.plans.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">{p.name}</h3>
                <p className="text-[11px] text-ink-faint">{p.id}</p>
              </div>
              {p.highlight && <Badge tone="blue">Popular</Badge>}
            </div>
            <p className="mt-2 text-lg font-semibold tracking-tight text-ink">{p.priceLabel}</p>
            <p className="text-[12px] text-ink-muted">
              {p.billingModel.replace(/_/g, " ")} · {p.seats} seats
            </p>
            <ul className="mt-3 space-y-1 text-[12px] text-ink-soft">
              {p.features.slice(0, 4).map((f) => (
                <li key={f} className="flex gap-1.5">
                  <span className="text-success-600" aria-hidden>✓</span>
                  <span className="truncate">{f}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {/* Subscriptions table */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={<CreditCard className="h-5 w-5" />} title="No subscriptions configured" />
          </div>
        ) : (
          <Table>
            <THead
              columns={[
                { label: "Organisation" },
                { label: "Plan" },
                { label: "Status" },
                { label: "Started" },
                { label: "Renews" },
                { label: "Seats" },
                { label: "Tickets (cycle)" },
                { label: "" },
              ]}
            />
            <TBody>
              {rows.map(({ s, oem, plan }) => (
                <Tr key={s.id} onClick={() => setDetailId(s.id)}>
                  <Td>
                    <p className="text-[13px] font-medium text-ink">{oem!.name}</p>
                    <p className="font-mono text-[11px] text-ink-faint">{oem!.id}</p>
                  </Td>
                  <Td>
                    <span className="text-[13px]">{plan?.name ?? s.planId}</span>
                    <span className="mt-0.5 block text-[11px] text-ink-faint">{plan?.priceLabel}</span>
                  </Td>
                  <Td><Badge tone={SUB_TONES[s.status] ?? "gray"} dot>{s.status.replace(/_/g, " ")}</Badge></Td>
                  <Td><span className="text-[12px]">{fmt(s.startedOn)}</span></Td>
                  <Td><span className="text-[12px]">{fmt(s.renewsOn)}</span></Td>
                  <Td>
                    <span className="text-[12px]">{s.seatsUsed}/{oem!.seats}</span>
                  </Td>
                  <Td><span className="text-[12px]">{s.ticketsThisCycle}{plan?.ticketQuota ? ` / ${plan.ticketQuota}` : ""}</span></Td>
                  <Td>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditId(s.id);
                      }}
                    >
                      Edit plan
                    </Button>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      {/* Edit modal */}
      {edit && (
        <Modal
          open
          onClose={() => setEditId(null)}
          title={`Plan & billing — ${edit.oem!.name}`}
          description="Changes are demo-only and update the live organisation card instantly."
          footer={
            <Button variant="outline" onClick={() => setEditId(null)}>Done</Button>
          }
        >
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-ink">Subscription plan</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {state.plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => updateOem(edit.oem!.id, { planId: p.id })}
                    className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      edit.s.planId === p.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-line bg-surface hover:border-brand-300"
                    }`}
                  >
                    <p className="text-[13px] font-medium text-ink">{p.name}</p>
                    <p className="text-[11px] text-ink-muted">{p.priceLabel} · {p.billingModel.replace(/_/g, " ")}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-ink">Subscription status</p>
              <div className="flex flex-wrap gap-2">
                {(["active", "trial", "past_due", "cancelled"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => updateOem(edit.oem!.id, { subscriptionStatus: st })}
                    className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      edit.s.status === st ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-ink-soft hover:bg-surface-alt"
                    }`}
                  >
                    {st.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-ink-faint">
              Note: this demo stores the plan on the organisation profile; invoice generation is simulated.
            </p>
          </div>
        </Modal>
      )}

      {/* Detail drawer-ish modal with invoices */}
      {detail && (
        <Modal
          open
          onClose={() => setDetailId(null)}
          size="lg"
          title={`${detail.oem!.name} — invoices`}
          description={`${detail.plan?.name ?? detail.s.planId} · renews ${formatDate(detail.s.renewsOn)}`}
          footer={<Button variant="outline" onClick={() => setDetailId(null)}>Close</Button>}
        >
          {detail.s.invoices.length === 0 ? (
            <EmptyState icon={<Receipt className="h-5 w-5" />} title="No invoices yet" description="Invoices generated in future cycles will be listed here (demo)." />
          ) : (
            <ul className="space-y-2">
              {detail.s.invoices.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-alt px-3.5 py-2.5">
                  <div>
                    <p className="text-[13px] font-medium text-ink">{inv.number}</p>
                    <p className="text-[11px] text-ink-faint">Issued {formatDate(inv.issuedOn)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-medium text-ink">{inv.amountLabel}</span>
                    <Badge tone={INVOICE_TONES[inv.status] ?? "gray"} dot>{inv.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-line pt-3 text-right">
            <Link href={`/admin/oems/${detail.oem!.id}`} className="text-[13px] font-medium text-brand-700 hover:text-brand-800">
              Open the full organisation profile →
            </Link>
          </div>
        </Modal>
      )}
    </div>
  );
}
