"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Banknote,
  CalendarCheck,
  Check,
  ClipboardCheck,
  FileText,
  Gauge,
  MapPin,
  Pencil,
  Phone,
  Star,
  Ticket as TicketIcon,
  Timer,
  Wrench,
} from "lucide-react";
import { useMyEngineer } from "@/lib/session";
import { useStore } from "@/lib/store";
import { OPEN_STATUSES, TICKET_STATUS_LABELS, TICKET_STATUS_TONES } from "@/lib/constants";
import {
  AUTO_ART_VALUE,
  INVERTER_ART_OPTIONS,
  autoInverterArtFor,
  inverterArtFor,
} from "@/lib/inverter-art";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/form";
import { InverterBackdrop } from "@/components/ui/inverter-backdrop";
import { ProgressBar } from "@/components/charts";
import { Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatDate } from "@/lib/utils";
import type { Engineer } from "@/lib/types";

interface ProfileForm {
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  serviceRadiusKm: number;
  availability: Engineer["availability"];
  maxLoad: number;
}

export default function EngineerProfilePage() {
  const router = useRouter();
  const { state, updateEngineer, toast } = useStore();
  const engineer = useMyEngineer();
  const [form, setForm] = useState<ProfileForm | null>(null);
  /** Pending card artwork choice — null means "no unsaved change". */
  const [cardArt, setCardArt] = useState<string | null>(null);

  if (!engineer) {
    return (
      <EmptyState
        icon={<Wrench className="h-5 w-5" />}
        title="No engineer profile linked"
        description="Switch to an engineer or partner manager demo user to view this profile."
        action={<Link href="/dashboard"><Button variant="outline">Back to dashboard</Button></Link>}
      />
    );
  }

  const partner = state.partners.find((p) => p.id === engineer.partnerId);
  const assignments = state.assignments.filter((a) => a.engineerId === engineer.id);
  const responded = assignments.filter((a) => a.respondedAt);
  const onTime = responded.filter((a) => a.respondedAt && a.respondedAt <= a.responseDeadline);
  const tickets = state.tickets
    .filter((t) => t.assignedEngineerId === engineer.id)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const open = tickets.filter((t) => OPEN_STATUSES.includes(t.status));
  const completed = tickets.filter((t) => t.status === "completed" || t.status === "closed");
  const reports = state.reports.filter((r) => r.engineerId === engineer.id);
  const approvedReports = reports.filter((r) => r.status === "approved");
  const documentsMissing = engineer.documents.filter((d) => d.status === "pending" || d.status === "missing" || d.status === "rejected");
  const loadPct = Math.round((engineer.currentLoad / Math.max(engineer.maxLoad, 1)) * 100);

  const openEdit = () =>
    setForm({
      name: engineer.name,
      phone: engineer.phone,
      email: engineer.email,
      city: engineer.city,
      state: engineer.state,
      pincode: engineer.pincode,
      address: engineer.address,
      serviceRadiusKm: engineer.serviceRadiusKm,
      availability: engineer.availability,
      maxLoad: engineer.maxLoad,
    });

  const save = () => {
    if (!form) return;
    if (!form.name.trim() || !form.phone.trim() || !form.city.trim()) {
      toast("Name, phone and city are required", { tone: "error" });
      return;
    }
    updateEngineer(engineer.id, { ...form, name: form.name.trim(), phone: form.phone.trim(), city: form.city.trim() });
    setForm(null);
    toast("Profile updated", { description: "Changes are stored locally for this demo." });
  };

  /* ---- Card background (engineer picks their own artwork) ---- */
  const effectiveCardArt = cardArt ?? engineer.cardArt ?? AUTO_ART_VALUE;
  const previewArt = inverterArtFor({
    productExpertise: engineer.productExpertise,
    cardArt: effectiveCardArt,
  });
  const artOptions = [
    {
      value: AUTO_ART_VALUE,
      label: "Auto (from my expertise)",
      src: autoInverterArtFor(engineer),
    },
    ...INVERTER_ART_OPTIONS.filter((o) => o.value !== AUTO_ART_VALUE),
  ];

  const saveCardArt = () => {
    updateEngineer(engineer.id, { cardArt: effectiveCardArt });
    setCardArt(null);
    toast("Card background updated", {
      description: "Your profile card now uses this artwork.",
    });
  };

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {engineer.name}
            <VerificationBadge status={engineer.verification} />
            <Badge tone={engineer.availability === "available" ? "green" : engineer.availability === "busy" ? "amber" : "gray"} dot>
              {engineer.availability}
            </Badge>
          </span>
        }
        description={`${engineer.id} · ${engineer.city}, ${engineer.state} · ${partner?.name ?? "Independent engineer"}`}
        breadcrumbs={<Breadcrumbs />}
        actions={
          <>
            <Link href="/engineer/onboarding"><Button variant="outline"><ClipboardCheck className="h-4 w-4" aria-hidden /> Onboarding</Button></Link>
            <Button onClick={openEdit}><Pencil className="h-4 w-4" aria-hidden /> Edit profile</Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Completed jobs" value={engineer.completedJobs} hint={`${open.length} open now`} icon={<TicketIcon className="h-4 w-4" />} tone="brand" />
        <StatCard label="Rating" value={`${engineer.rating.toFixed(1)}/5`} hint={`${approvedReports.length} approved reports`} icon={<Star className="h-4 w-4" />} tone="success" />
        <StatCard label="Acceptance rate" value={`${engineer.acceptanceRate}%`} hint={`${engineer.rejectionRate}% declined`} icon={<Check className="h-4 w-4" />} tone={engineer.acceptanceRate >= 70 ? "success" : "warning"} />
        <StatCard label="Current load" value={`${engineer.currentLoad}/${engineer.maxLoad}`} hint={loadPct >= 90 ? "At capacity" : "Accepting offers"} icon={<Gauge className="h-4 w-4" />} tone={loadPct >= 90 ? "danger" : "default"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="Performance" description="Derived from offers, visits and submitted service reports across this demo dataset." />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-ink-muted"><span>Offer acceptance</span><span className="font-medium text-ink">{engineer.acceptanceRate}%</span></div>
                <ProgressBar value={engineer.acceptanceRate} tone={engineer.acceptanceRate >= 70 ? "success" : "warning"} />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-ink-muted"><span>Report quality</span><span className="font-medium text-ink">{engineer.reportQualityScore}/100</span></div>
                <ProgressBar value={engineer.reportQualityScore} tone={engineer.reportQualityScore >= 75 ? "success" : "warning"} />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-ink-muted"><span>Capacity used</span><span className="font-medium text-ink">{loadPct}%</span></div>
                <ProgressBar value={loadPct} tone={loadPct >= 90 ? "danger" : loadPct >= 70 ? "warning" : "brand"} />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-ink-muted"><span>On-time responses</span><span className="font-medium text-ink">{responded.length ? Math.round((onTime.length / responded.length) * 100) : 100}%</span></div>
                <ProgressBar value={responded.length ? Math.round((onTime.length / responded.length) * 100) : 100} tone="success" />
              </div>
            </div>
            <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-[13px] sm:grid-cols-3">
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Offers handled</dt><dd className="mt-0.5 font-medium text-ink">{assignments.length}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Avg response</dt><dd className="mt-0.5 flex items-center gap-1 font-medium text-ink"><Timer className="h-3.5 w-3.5 text-ink-faint" aria-hidden /> {engineer.avgResponseMins} min</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Experience</dt><dd className="mt-0.5 font-medium text-ink">{engineer.experienceYears} years</dd></div>
            </dl>
          </Card>

          <Card padded={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
              <CardHeader title="Recent assignments" description={`${open.length} open · ${completed.length} completed`} className="mb-0 p-0" />
              <Link href="/engineer/assignments" className="text-[12px] font-medium text-brand-700 hover:underline">View all</Link>
            </div>
            {tickets.length === 0 ? (
              <p className="p-4 text-[13px] text-ink-muted">No assignments yet. Accepted offers will appear here.</p>
            ) : (
              <div className="mt-2">
                <Table>
                  <THead columns={[{ label: "Ticket" }, { label: "Issue" }, { label: "Site" }, { label: "Updated" }, { label: "Status" }]} />
                  <TBody>
                    {tickets.slice(0, 6).map((t) => (
                      <Tr key={t.id} onClick={() => router.push(`/engineer/assignments/${t.id}`)}>
                        <Td><span className="font-mono text-[11px] font-medium text-ink">{t.ref}</span></Td>
                        <Td><span className="block max-w-56 truncate text-[12px] text-ink-soft">{t.issue.category}</span></Td>
                        <Td><span className="text-[12px] text-ink-soft">{t.location.city}<br /><span className="text-[11px] text-ink-faint">{t.location.state}</span></span></Td>
                        <Td><span className="text-[11px] text-ink-faint">{formatDate(t.updatedAt)}</span></Td>
                        <Td><Badge tone={TICKET_STATUS_TONES[t.status]} dot>{TICKET_STATUS_LABELS[t.status]}</Badge></Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Verification documents" description="RAYVIQ reviews these before offers are unlocked." action={<Link href="/engineer/onboarding" className="text-[12px] font-medium text-brand-700 hover:underline">Manage</Link>} />
            <ul className="divide-y divide-line">
              {engineer.documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-ink-muted"><FileText className="h-4 w-4" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-ink">{d.label}</span>
                    <span className="block text-[11px] capitalize text-ink-faint">{d.type.replace(/_/g, " ")}{d.uploadedAt ? ` · ${formatDate(d.uploadedAt)}` : " · not uploaded"}</span>
                  </span>
                  <Badge tone={d.status === "verified" ? "green" : d.status === "rejected" ? "red" : d.status === "missing" ? "gray" : "amber"}>{d.status}</Badge>
                </li>
              ))}
            </ul>
            {documentsMissing.length > 0 && (
              <p className="mt-3 rounded-lg border border-warning-100 bg-warning-50 px-3 py-2 text-[11px] leading-5 text-warning-700">
                {documentsMissing.length} document{documentsMissing.length === 1 ? "" : "s"} still need attention before verification can complete.
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Contact & service area" />
            <dl className="space-y-3 text-[13px]">
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Phone</dt><dd className="mt-0.5 flex items-center gap-1.5 text-ink-soft"><Phone className="h-3.5 w-3.5" aria-hidden /> {engineer.phone}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Email</dt><dd className="mt-0.5 break-all text-ink-soft">{engineer.email}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Address</dt><dd className="mt-0.5 text-ink-soft">{engineer.address}<br />{engineer.city}, {engineer.state} {engineer.pincode}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Service radius</dt><dd className="mt-0.5 flex items-center gap-1.5 text-ink-soft"><MapPin className="h-3.5 w-3.5" aria-hidden /> {engineer.serviceRadiusKm} km</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Partner</dt><dd className="mt-0.5 text-ink-soft">{partner?.name ?? "Independent"}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Joined</dt><dd className="mt-0.5 flex items-center gap-1.5 text-ink-soft"><CalendarCheck className="h-3.5 w-3.5" aria-hidden /> {formatDate(engineer.joinedAt)}</dd></div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Skills & certifications" />
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Skills</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{engineer.skills.map((s) => <Badge key={s} tone="gray">{s}</Badge>)}</div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Certifications</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{engineer.certifications.length ? engineer.certifications.map((c) => <Badge key={c} tone="blue">{c}</Badge>) : <span className="text-[12px] text-ink-muted">None recorded</span>}</div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Product expertise</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{engineer.productExpertise.map((p) => <Badge key={p} tone="cyan">{p}</Badge>)}</div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Languages</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{engineer.languages.map((l) => <Badge key={l} tone="gray">{l}</Badge>)}</div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Card background"
              description="Choose the inverter artwork shown behind your photo on the marketplace and in the customer app."
            />
            <div className="relative h-20 overflow-hidden rounded-xl" style={{ backgroundColor: "#2554e0" }}>
              <InverterBackdrop src={previewArt} opacity={0.6} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {artOptions.map((opt) => {
                const active = effectiveCardArt === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setCardArt(opt.value)}
                    aria-pressed={active}
                    className={`relative overflow-hidden rounded-lg border-2 text-left transition-all ${
                      active ? "border-brand-600" : "border-transparent hover:border-brand-200"
                    }`}
                  >
                    <span className="relative block h-12" style={{ backgroundColor: "#2554e0" }}>
                      <InverterBackdrop src={opt.src} opacity={0.6} />
                    </span>
                    <span className="block bg-surface-alt px-1.5 py-1 text-[10.5px] font-medium text-ink-soft">
                      {opt.label}
                    </span>
                    {active && (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white">
                        <Check className="h-2.5 w-2.5" aria-hidden />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <Input
              label="Custom image URL (optional)"
              value={effectiveCardArt.startsWith("http") ? effectiveCardArt : ""}
              onChange={(e) => setCardArt(e.target.value)}
              placeholder="https://example.com/my-inverter.jpg"
              hint="Link your own artwork to replace the preset illustrations."
              className="mt-3"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button onClick={saveCardArt} disabled={cardArt === null}>Save background</Button>
              {cardArt !== null && (
                <Button variant="outline" onClick={() => setCardArt(null)}>Cancel</Button>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Payout profile" />
            <div className="flex items-start gap-2.5 text-[13px]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-ink-muted"><Banknote className="h-4 w-4" aria-hidden /></span>
              <div>
                <p className="font-medium text-ink">{engineer.bankDetailsProvided ? "Bank details on file" : "Bank details missing"}</p>
                <p className="mt-0.5 text-[11px] leading-5 text-ink-faint">
                  {engineer.bankDetailsProvided ? "Verified payouts are enabled for this demo engineer." : "Add payout details during onboarding to receive settlement."}
                </p>
              </div>
            </div>
          </Card>

          {engineer.verification === "approved" ? (
            <div className="rounded-xl border border-success-100 bg-success-50 p-4">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-success-700"><BadgeCheck className="h-4 w-4" aria-hidden /> Verified engineer</p>
              <p className="mt-1 text-[11px] leading-5 text-success-700/90">You can receive OEM offers. Warranty and repair decisions stay with the OEM.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-warning-100 bg-warning-50 p-4">
              <p className="text-[13px] font-semibold text-warning-800">Verification in progress</p>
              <p className="mt-1 text-[11px] leading-5 text-warning-700/90">Offers unlock after RAYVIQ approves your documents. Current status: {engineer.verification.replace(/_/g, " ")}.</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title="Edit profile"
        description="Keep your contact and service-area details current so OEM offers reach the right engineer."
        size="lg"
        footer={<><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>Save changes</Button></>}
      >
        {form && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="sm:col-span-2" />
            <Input label="City" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            <Input label="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            <Input label="Service radius (km)" type="number" min={5} value={form.serviceRadiusKm} onChange={(e) => setForm({ ...form, serviceRadiusKm: Number(e.target.value) })} />
            <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="sm:col-span-2" />
            <Select
              label="Availability"
              value={form.availability}
              onChange={(e) => setForm({ ...form, availability: e.target.value as Engineer["availability"] })}
              options={[{ value: "available", label: "Available" }, { value: "busy", label: "Busy" }, { value: "offline", label: "Offline" }]}
            />
            <Input label="Maximum concurrent jobs" type="number" min={1} value={form.maxLoad} onChange={(e) => setForm({ ...form, maxLoad: Number(e.target.value) })} hint="Used by the assignment recommendations." />
          </div>
        )}
      </Modal>
    </div>
  );
}
