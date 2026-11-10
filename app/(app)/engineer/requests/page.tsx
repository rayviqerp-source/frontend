"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Clock,
  MapPin,
  Sparkles,
  Ticket as TicketIcon,
  X,
} from "lucide-react";
import { useEngineerTickets, useMyEngineer } from "@/lib/session";
import { useStore } from "@/lib/store";
import {
  PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TONES,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, StatCard } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { SearchInput } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatDateTime, relativeTime } from "@/lib/utils";
import type { Ticket } from "@/lib/types";

type TabKey = "offers" | "nearby" | "history";

export default function EngineerRequestsPage() {
  const router = useRouter();
  const { state, respondToOffer } = useStore();
  const engineer = useMyEngineer();
  const { offers } = useEngineerTickets();
  const [tab, setTab] = useState<TabKey>("offers");
  const [query, setQuery] = useState("");
  const [declineTarget, setDeclineTarget] = useState<Ticket | null>(null);
  const [reason, setReason] = useState("");

  const nearby = useMemo(() => {
    if (!engineer) return [];
    const q = query.trim().toLowerCase();
    return state.tickets
      .filter(
        (t) =>
          t.status === "awaiting_assignment" &&
          (t.location.state === engineer.state || t.location.city === engineer.city) &&
          (!q ||
            t.ref.toLowerCase().includes(q) ||
            t.issue.category.toLowerCase().includes(q) ||
            t.location.city.toLowerCase().includes(q)),
      )
      .sort((a, b) => (a.priority < b.priority ? 1 : -1));
  }, [state.tickets, engineer, query]);

  const history = useMemo(() => {
    if (!engineer) return [];
    return state.assignments
      .filter((a) => a.engineerId === engineer.id && (a.state === "rejected" || a.state === "no_response" || a.state === "revoked"))
      .sort((a, b) => ((a.respondedAt ?? a.assignedAt) < (b.respondedAt ?? b.assignedAt) ? 1 : -1));
  }, [state.assignments, engineer]);

  const filteredOffers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return offers;
    return offers.filter(
      (t) => t.ref.toLowerCase().includes(q) || t.issue.category.toLowerCase().includes(q) || t.location.city.toLowerCase().includes(q),
    );
  }, [offers, query]);

  const submitDecline = () => {
    if (!declineTarget) return;
    if (!reason.trim()) return;
    respondToOffer(declineTarget.id, false, reason.trim());
    setDeclineTarget(null);
    setReason("");
  };

  return (
    <div>
      <PageHeader
        title="Available requests"
        description="Offers waiting for your response, plus open breakdowns near your service area. Responding quickly protects the OEM's SLA."
        breadcrumbs={<Breadcrumbs />}
        actions={
          engineer ? (
            <Button variant="outline" onClick={() => router.push("/engineer/profile")}>
              <Sparkles className="h-4 w-4" aria-hidden /> My performance
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Offers pending" value={offers.length} hint={offers.length ? "Response needed" : "Nothing waiting"} icon={<Clock className="h-4 w-4" />} tone={offers.length ? "warning" : "success"} />
        <StatCard label="Open nearby" value={nearby.length} hint={engineer ? `${engineer.city}, ${engineer.state}` : "Service area"} icon={<MapPin className="h-4 w-4" />} tone="brand" />
        <StatCard label="Acceptance rate" value={engineer ? `${engineer.acceptanceRate}%` : "—"} hint={engineer ? `${engineer.rejectionRate}% declined` : ""} icon={<Check className="h-4 w-4" />} tone="success" />
        <StatCard label="Current load" value={engineer ? `${engineer.currentLoad}/${engineer.maxLoad}` : "—"} hint={engineer ? engineer.availability.replace(/_/g, " ") : ""} icon={<TicketIcon className="h-4 w-4" />} tone={engineer && engineer.currentLoad >= engineer.maxLoad ? "danger" : "default"} />
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 pt-2">
          <Tabs
            tabs={[
              { key: "offers", label: "Offers for you", count: offers.length, icon: <Sparkles className="h-3.5 w-3.5" /> },
              { key: "nearby", label: "Open nearby", count: nearby.length, icon: <MapPin className="h-3.5 w-3.5" /> },
              { key: "history", label: "Declined history", count: history.length, icon: <X className="h-3.5 w-3.5" /> },
            ]}
            active={tab}
            onChange={(k) => setTab(k as TabKey)}
            className="border-b-0"
          />
          <SearchInput value={query} onChange={setQuery} placeholder="Search ref, issue or city…" className="mb-2 w-full sm:w-64" />
        </div>

        <div className="p-4">
          {tab === "offers" && (
            filteredOffers.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="h-5 w-5" />}
                title="No offers waiting"
                description="When an OEM offers you a ticket it will appear here with a response deadline."
                action={<Button variant="outline" onClick={() => setTab("nearby")}>Browse open requests</Button>}
              />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {filteredOffers.map((t) => {
                  const site = state.sites.find((s) => s.id === t.siteId);
                  const customer = state.customers.find((c) => c.id === t.customerId);
                  const assignment = [...state.assignments].reverse().find((a) => a.ticketId === t.id && a.state === "pending_offer");
                  return (
                    <div key={t.id} className="rounded-xl border border-line p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] font-medium text-ink">{t.ref}</p>
                          <h3 className="mt-0.5 text-sm font-semibold text-ink">{t.issue.category}</h3>
                          <p className="text-[12px] text-ink-muted">{customer?.name ?? "Customer"} · {site?.name ?? t.location.city}</p>
                        </div>
                        <Badge tone={t.priority === "critical" ? "red" : t.priority === "high" ? "amber" : t.priority === "medium" ? "blue" : "gray"}>{PRIORITY_LABELS[t.priority]}</Badge>
                      </div>
                      <div className="mt-3 grid gap-1.5 text-[12px] text-ink-muted sm:grid-cols-2">
                        <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" aria-hidden /> {t.location.city}, {t.location.state}</p>
                        <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" aria-hidden /> Respond {relativeTime(assignment?.responseDeadline)}</p>
                        <p>Product: {t.product.model}</p>
                        <p>Warranty: {t.product.warrantyStatus.replace(/_/g, " ")}</p>
                      </div>
                      <p className="mt-3 line-clamp-2 rounded-lg bg-surface-alt px-3 py-2 text-[12px] leading-5 text-ink-soft">{t.issue.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="success" onClick={() => respondToOffer(t.id, true)}><Check className="h-3.5 w-3.5" aria-hidden /> Accept</Button>
                        <Button size="sm" variant="outline" onClick={() => { setDeclineTarget(t); setReason(""); }}><X className="h-3.5 w-3.5" aria-hidden /> Decline</Button>
                        <Link href={`/engineer/requests/${t.id}`} className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-brand-700">
                          Full details <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {tab === "nearby" && (
            nearby.length === 0 ? (
              <EmptyState icon={<MapPin className="h-5 w-5" />} title="No open requests nearby" description="Open breakdowns in your state will appear here." />
            ) : (
              <div className="space-y-2">
                {nearby.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-ink-muted"><TicketIcon className="h-4 w-4" aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[11px] font-medium text-ink">{t.ref}</span>
                        <Badge tone={TICKET_STATUS_TONES[t.status]}>{TICKET_STATUS_LABELS[t.status]}</Badge>
                        <Badge tone={t.priority === "critical" ? "red" : t.priority === "high" ? "amber" : "gray"}>{PRIORITY_LABELS[t.priority]}</Badge>
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-ink-muted">{t.issue.category} · {t.location.city} · {t.product.model}</span>
                    </span>
                    <span className="text-[11px] text-ink-faint">Raised {relativeTime(t.createdAt)}</span>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/engineer/requests/${t.id}`)}>View</Button>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "history" && (
            history.length === 0 ? (
              <EmptyState icon={<X className="h-5 w-5" />} title="No declined offers" description="Offers you decline or miss will be recorded here." />
            ) : (
              <div className="space-y-2">
                {history.map((a) => {
                  const t = state.tickets.find((x) => x.id === a.ticketId);
                  return (
                    <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="font-mono text-[11px] font-medium text-ink">{t?.ref ?? a.ticketId}</span>
                        <span className="mt-0.5 block truncate text-[12px] text-ink-muted">{t?.issue.category ?? "Ticket"} · {a.reason ?? a.state.replace(/_/g, " ")}</span>
                      </span>
                      <Badge tone={a.state === "rejected" ? "amber" : "gray"}>{a.state.replace(/_/g, " ")}</Badge>
                      <span className="text-[11px] text-ink-faint">{formatDateTime(a.respondedAt ?? a.assignedAt)}</span>
                      {t && <Button size="sm" variant="ghost" onClick={() => router.push(`/engineer/requests/${t.id}`)}>View</Button>}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </Card>

      <Modal
        open={Boolean(declineTarget)}
        onClose={() => setDeclineTarget(null)}
        title="Decline this offer"
        description="A specific reason helps the OEM route the ticket to the right engineer."
        footer={
          <>
            <Button variant="outline" onClick={() => setDeclineTarget(null)}>Cancel</Button>
            <Button variant="danger" disabled={!reason.trim()} onClick={submitDecline}>Decline offer</Button>
          </>
        }
      >
        <Textarea
          label="Reason for declining"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Outside my service radius; requires central inverter certification."
        />
      </Modal>
    </div>
  );
}
