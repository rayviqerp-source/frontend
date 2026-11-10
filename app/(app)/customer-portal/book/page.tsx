"use client";

/**
 * Customer booking wizard — see "Agent coordination" in AGENTS.md
 * before editing this file.
 */

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { ISSUE_CATEGORIES } from "@/lib/constants";
import { recommendEngineers } from "@/lib/selectors";
import { addDays, formatDate, todayIso } from "@/lib/utils";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import type { Ticket } from "@/lib/types";

const STEPS = ["Equipment", "Issue", "Schedule", "Confirm"] as const;

const SLOTS = [
  "Morning (9 AM – 12 PM)",
  "Afternoon (12 PM – 4 PM)",
  "Evening (4 PM – 7 PM)",
] as const;

const URGENCY: { value: Ticket["priority"]; label: string; hint: string }[] = [
  { value: "critical", label: "Emergency — plant down", hint: "Safety risk or complete generation loss" },
  { value: "high", label: "Urgent — within 48 hours", hint: "Major output loss or repeated faults" },
  { value: "medium", label: "This week", hint: "Degraded performance, non-blocking" },
  { value: "low", label: "Whenever convenient", hint: "Cosmetic or advisory issue" },
];

const CATEGORY_GROUP: Record<string, Ticket["issue"]["categoryGroup"]> = {
  "No output / zero generation": "performance",
  "Inverter tripping frequently": "electrical",
  "Error code displayed": "electrical",
  "Grid mismatch / low voltage": "electrical",
  "Communication / Wi-Fi failure": "communication",
  "AC isolator or MCB issue": "electrical",
  "DC string fuse failure": "electrical",
  "Fan or cooling fault": "mechanical",
  "Display / HMI malfunction": "other",
  "Physical damage or corrosion": "mechanical",
  "Water ingress": "installation",
  "Installation quality issue": "installation",
  "Metering or monitoring issue": "communication",
  "Preventive maintenance request": "other",
  Other: "other",
};

export default function BookEngineerPage() {
  const { state, createTicket, assignTicket, toast } = useStore();

  const sessionIds = state.portalCustomerIds;
  const customer = state.customers.find((c) => sessionIds.includes(c.id));

  const [step, setStep] = useState(0);
  const [siteId, setSiteId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [priority, setPriority] = useState<Ticket["priority"]>("medium");
  const [date, setDate] = useState(() => addDays(todayIso(), 1));
  const [slot, setSlot] = useState<string>(SLOTS[1]);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState<{ ticket: Ticket; engineerName: string | null } | null>(null);

  if (!customer) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<UserRound className="h-5 w-5" />}
          title="Start a portal session first"
          description="Booking is available inside the customer portal. Pick a customer identity to preview their booking experience."
          action={<Link href="/customer-portal"><Button>Open customer portal</Button></Link>}
        />
      </div>
    );
  }

  const sites = state.sites.filter((s) => s.customerId === customer.id);
  const site = sites.find((s) => s.id === siteId);
  const equipment = state.equipment.filter((e) => site && e.siteId === site.id);

  const canNext =
    step === 0
      ? Boolean(siteId)
      : step === 1
        ? Boolean(category) && description.trim().length >= 10
        : step === 2
          ? Boolean(date) && Boolean(contactPhone.trim())
          : true;

  const confirmBooking = () => {
    if (!site) return;
    const ticket = createTicket({
      customerId: customer.id,
      siteId: site.id,
      equipmentId: equipmentId || undefined,
      contactName: contactName.trim() || customer.name,
      contactPhone: contactPhone.trim() || customer.phone,
      availability: `${slot}, ${formatDate(date)}${notes.trim() ? ` — ${notes.trim()}` : ""}`,
      category,
      categoryGroup: CATEGORY_GROUP[category] ?? "other",
      description: description.trim(),
      errorCode: errorCode.trim() || undefined,
      priority,
      source: "portal",
    });
    // Auto-offer the booking to the best-matched approved engineer (demo matching engine).
    const [best] = recommendEngineers(state, ticket, 1);
    let engineerName: string | null = null;
    if (best) {
      assignTicket(ticket.id, best.engineer.id);
      engineerName = best.engineer.name;
    }
    setConfirmed({ ticket, engineerName });
    toast("Booking confirmed", {
      description: `${ticket.ref} logged — the engineer network has been notified.`,
    });
  };

  /* ---------------- confirmation screen ---------------- */

  if (confirmed) {
    const { ticket, engineerName } = confirmed;
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-ink">Booking confirmed</h2>
          <p className="mt-1 text-[13px] text-ink-muted">
            Reference <span className="font-mono font-medium text-brand-700">{ticket.ref}</span> ·{" "}
            {slot}, {formatDate(date)} · {ticket.location.city}
          </p>

          <div className="mt-6 rounded-xl border border-line bg-surface-alt/60 p-4 text-left">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-600" />
              <p className="text-sm font-medium text-ink">
                {engineerName ? `Offer sent to ${engineerName}` : "Queued for assignment"}
              </p>
              <Badge tone={engineerName ? "blue" : "amber"}>
                {engineerName ? "awaiting acceptance" : "next available engineer"}
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-muted">
              {engineerName
                ? "You'll see the engineer's acceptance and visit plan on the tracking page. They will call before arriving."
                : "No engineer is currently matched for your area — the OEM service desk will assign one shortly."}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/customer-portal/bookings/${ticket.id}`}>
              <Button>
                <CalendarClock className="h-4 w-4" /> Track this booking
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmed(null);
                setStep(0);
                setSiteId("");
                setEquipmentId("");
                setCategory("");
                setDescription("");
                setErrorCode("");
                setNotes("");
              }}
            >
              <Wrench className="h-4 w-4" /> Book another service
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /* ---------------- wizard ---------------- */

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Book an engineer"
        description={`Log a service request for ${customer.name}. The OEM service desk receives it instantly and a verified engineer is matched to your site.`}
        actions={
          <Link href="/customer-portal">
            <Button variant="ghost"><ArrowLeft className="h-4 w-4" /> Back to portal</Button>
          </Link>
        }
      />

      {/* stepper */}
      <ol className="mb-5 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                i < step
                  ? "bg-green-100 text-green-700"
                  : i === step
                    ? "bg-brand-600 text-white"
                    : "bg-surface-alt text-ink-faint"
              }`}
            >
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`hidden text-xs font-medium sm:block ${i === step ? "text-ink" : "text-ink-faint"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      <Card className="p-5">
        {step === 0 && (
          <>
            <CardHeader title="Which site needs service?" description="Pick the installation and, if known, the exact equipment." />
            <div className="space-y-4">
              <Select
                label="Site"
                value={siteId}
                onChange={(e) => { setSiteId(e.target.value); setEquipmentId(""); }}
                placeholder="Select a site…"
                options={sites.map((s) => ({ value: s.id, label: `${s.name} — ${s.city} (${s.capacityKw} kW)` }))}
              />
              {site && (
                <Select
                  label="Equipment (optional)"
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                  placeholder="Not sure / general issue"
                  options={equipment.map((eq) => ({ value: eq.id, label: `${eq.model} · SN ${eq.serialNumber} · ${eq.capacityKw} kW` }))}
                />
              )}
              {site && (
                <p className="flex items-start gap-2 text-xs leading-5 text-ink-faint">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {site.address}, {site.city}, {site.state} — {site.pincode}
                  {site.amcId ? " · covered by an active AMC contract" : " · AMC not linked to this site"}
                </p>
              )}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <CardHeader title="What is the problem?" description="A clear description helps us match the right specialist." />
            <div className="space-y-4">
              <Select
                label="Issue category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Select a category…"
                options={ISSUE_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
              <Textarea
                label="Describe the issue"
                placeholder="e.g. Inverter shows Fault 23 every morning around 10 AM and generation drops to zero…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Error code (optional)"
                  placeholder="e.g. F-23"
                  value={errorCode}
                  onChange={(e) => setErrorCode(e.target.value)}
                />
                <Select
                  label="How urgent is it?"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Ticket["priority"])}
                  options={URGENCY.map((u) => ({ value: u.value, label: u.label }))}
                />
              </div>
              <p className="text-xs text-ink-faint">{URGENCY.find((u) => u.value === priority)?.hint}</p>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader title="When should the engineer visit?" description="Pick a preferred date and window — the engineer confirms before arriving." />
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Preferred date" type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
                <Select
                  label="Time window"
                  value={slot}
                  onChange={(e) => setSlot(e.target.value)}
                  options={SLOTS.map((s) => ({ value: s, label: s }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Contact person" placeholder={customer.name} value={contactName} onChange={(e) => setContactName(e.target.value)} />
                <Input label="Contact phone" placeholder={customer.phone} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </div>
              <Textarea
                label="Access notes (optional)"
                placeholder="e.g. Gate pass required, ask for security at the main plant entry…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </>
        )}

        {step === 3 && site && (
          <>
            <CardHeader title="Review your booking" description="Confirm the details — you can track everything from the portal afterwards." />
            <dl className="space-y-2 text-[13px]">
              {[
                ["Site", `${site.name}, ${site.city}`],
                ["Equipment", equipmentId ? (equipment.find((e) => e.id === equipmentId)?.model ?? "—") : "General visit"],
                ["Issue", `${category}${errorCode ? ` (${errorCode})` : ""}`],
                ["Description", description],
                ["Urgency", URGENCY.find((u) => u.value === priority)?.label ?? priority],
                ["Preferred slot", `${slot}, ${formatDate(date)}`],
                ["Contact", `${contactName.trim() || customer.name} · ${contactPhone.trim() || customer.phone}`],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[130px_1fr] gap-3 rounded-lg bg-surface-alt/60 px-3 py-2">
                  <dt className="text-ink-faint">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-ink-faint">
              <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Warranty and repair decisions remain with the OEM — RAYVIQ coordinates the visit and documentation.
            </p>
          </>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button disabled={!canNext} onClick={confirmBooking}>
              <CheckCircle2 className="h-4 w-4" /> Confirm booking
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
