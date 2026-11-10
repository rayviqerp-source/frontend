"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Info, Send } from "lucide-react";
import { useStore, useMyOemId } from "@/lib/store";
import { ISSUE_CATEGORIES, PRIORITY_LABELS } from "@/lib/constants";
import type { NewTicketInput } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form";

const CATEGORY_GROUPS: Record<string, { value: NewTicketInput["categoryGroup"]; label: string }> = {
  Communication: { value: "communication", label: "Communication" },
  Electrical: { value: "electrical", label: "Electrical" },
  Performance: { value: "performance", label: "Performance" },
  Mechanical: { value: "mechanical", label: "Mechanical" },
  Installation: { value: "installation", label: "Installation" },
  Other: { value: "other", label: "Other" },
};

export default function NewTicketPage() {
  const router = useRouter();
  const { createTicket, toast } = useStore();
  const oemId = useMyOemId();

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customerId: "",
    siteId: "",
    equipmentId: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    availability: "Weekdays 10:00 – 18:00",
    address: "",
    state: "",
    city: "",
    pincode: "",
    model: "",
    serialNumber: "",
    warrantyStatus: "unknown" as NewTicketInput["warrantyStatus"],
    categoryGroup: "communication" as NewTicketInput["categoryGroup"],
    category: "",
    errorCode: "",
    description: "",
    priority: "medium" as NewTicketInput["priority"],
    attachments: [] as string[],
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const sitesForCustomer = state_sitesForCustomer(form.customerId);
  const equipmentForSite = state_equipmentForSite(form.siteId);

  function state_sitesForCustomer(customerId: string) {
    return sitesRef.filter((s) => s.customerId === customerId);
  }
  function state_equipmentForSite(siteId: string) {
    return equipmentRef.filter((e) => e.siteId === siteId);
  }

  const { state } = useStore();
  const sitesRef = state.sites;
  const equipmentRef = state.equipment;

  const selectedSite = state.sites.find((s) => s.id === form.siteId);
  const selectedCustomer = state.customers.find((c) => c.id === form.customerId);
  const selectedEquipment = state.equipment.find((e) => e.id === form.equipmentId);

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!form.customerId) errs.customerId = "Select a customer";
    if (!form.siteId) errs.siteId = "Select a site";
    if (!form.contactName.trim()) errs.contactName = "Contact name is required";
    if (form.contactPhone.replace(/\D/g, "").length < 10) errs.contactPhone = "Valid phone required";
    if (!form.city.trim()) errs.city = "City is required";
    if (!form.address.trim()) errs.address = "Address is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!form.category) errs.category = "Select an issue category";
    if (form.description.trim().length < 20) errs.description = "Describe the issue in at least 20 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = () => {
    setSaving(true);
    window.setTimeout(() => {
      try {
        const ticket = createTicket({
          oemId: oemId ?? undefined,
          customerId: form.customerId,
          siteId: form.siteId,
          equipmentId: form.equipmentId || undefined,
          contactName: form.contactName,
          contactPhone: form.contactPhone,
          contactEmail: form.contactEmail || undefined,
          availability: form.availability,
          address: form.address,
          state: form.state,
          city: form.city,
          pincode: form.pincode,
          model: form.model || selectedEquipment?.model,
          serialNumber: form.serialNumber || selectedEquipment?.serialNumber,
          warrantyStatus: form.warrantyStatus,
          category: form.category,
          categoryGroup: form.categoryGroup,
          description: form.description,
          errorCode: form.errorCode || undefined,
          priority: form.priority,
          source: "portal",
        });
        toast(`Ticket ${ticket.ref} created`, {
          description: "SLA clock started — notifications fanned out (demo).",
        });
        router.push(`/oem/tickets/${ticket.id}`);
      } catch {
        toast("Could not create ticket", { tone: "error" });
      } finally {
        setSaving(false);
      }
    }, 350);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/oem/tickets"
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Tickets
      </Link>

      <PageHeader
        title="New service ticket"
        description="Log a customer issue — SLA clocks (response, assignment, visit, resolution) start immediately based on priority."
      />

      {/* Steps */}
      <ol className="mb-5 flex items-center gap-2">
        {["Location & contact", "Issue details", "Review"].map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                  active
                    ? "bg-brand-600 text-white"
                    : done
                      ? "bg-success-100 text-success-700"
                      : "bg-surface-alt text-ink-faint"
                }`}
              >
                {done ? "✓" : n}
              </span>
              <span className={`hidden text-[13px] sm:block ${active ? "font-medium text-ink" : "text-ink-muted"}`}>
                {label}
              </span>
              {i < 2 && <span className="h-px flex-1 bg-line" />}
            </li>
          );
        })}
      </ol>

      <Card className="p-5">
        {step === 1 && (
          <div className="space-y-4">
            <CardHeader title="Customer & site" description="Pick where the issue occurred." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Customer"
                required
                placeholder="Select customer…"
                value={form.customerId}
                onChange={(e) => set("customerId", e.target.value)}
                options={state.customers.map((c) => ({
                  value: c.id,
                  label: `${c.name}${c.company ? ` — ${c.company}` : ""}`,
                }))}
                error={errors.customerId}
              />
              <Select
                label="Site"
                required
                placeholder={form.customerId ? "Select site…" : "Choose customer first"}
                value={form.siteId}
                onChange={(e) => set("siteId", e.target.value)}
                disabled={!form.customerId}
                options={sitesForCustomer.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.city})`,
                }))}
                error={errors.siteId}
              />
            </div>

            {selectedSite && (
              <div className="rounded-lg border border-line bg-surface-alt/60 px-4 py-3 text-[13px]">
                <p className="font-medium text-ink">{selectedSite.name}</p>
                <p className="mt-0.5 text-ink-muted">
                  {selectedSite.address} — {selectedSite.city}, {selectedSite.state} {selectedSite.pincode}
                </p>
                <p className="mt-0.5 text-ink-muted">
                  {selectedSite.capacityKw} kW · {selectedSite.siteType.replace(/_/g, " ")}
                  {selectedSite.amcId ? " · AMC covered" : ""}
                </p>
              </div>
            )}

            <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <Input
                label="Contact person"
                required
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
                error={errors.contactName}
                placeholder={selectedCustomer?.name}
              />
              <Input
                label="Contact phone"
                required
                type="tel"
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
                error={errors.contactPhone}
                placeholder="+91 98xxx xxxxx"
              />
              <Input
                label="Contact email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
                placeholder="optional"
              />
              <Input
                label="Availability window"
                value={form.availability}
                onChange={(e) => set("availability", e.target.value)}
                hint="When can an engineer visit?"
              />
            </div>

            <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
              <Input
                label="Address"
                required
                className="sm:col-span-3"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                error={errors.address}
                placeholder="Street / landmark"
              />
              <Input
                label="City"
                required
                value={form.city || selectedSite?.city || ""}
                onChange={(e) => set("city", e.target.value)}
                error={errors.city}
              />
              <Input
                label="State"
                value={form.state || selectedSite?.state || ""}
                onChange={(e) => set("state", e.target.value)}
              />
              <Input
                label="Pincode"
                value={form.pincode || selectedSite?.pincode || ""}
                onChange={(e) => set("pincode", e.target.value)}
              />
            </div>

            <div className="flex justify-end border-t border-line pt-4">
              <Button
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
              >
                Continue to issue details
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <CardHeader
              title="Issue details"
              description="Categorise and describe the fault so matching and triage work well."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Issue group"
                value={form.categoryGroup}
                onChange={(e) => set("categoryGroup", e.target.value as NewTicketInput["categoryGroup"])}
                options={Object.values(CATEGORY_GROUPS)}
              />
              <Select
                label="Issue category"
                required
                placeholder="Select category…"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                options={ISSUE_CATEGORIES.map((c) => ({ value: c, label: c }))}
                error={errors.category}
              />
            </div>

            <Textarea
              label="Description"
              required
              hint={`${form.description.length}/20 min characters`}
              placeholder="What is happening? When did it start? Any error patterns on the display?"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              error={errors.description}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Error code (if any)"
                value={form.errorCode}
                onChange={(e) => set("errorCode", e.target.value)}
                placeholder="e.g. E-021"
              />
              <Select
                label="Priority"
                value={form.priority}
                onChange={(e) => set("priority", e.target.value as NewTicketInput["priority"])}
                options={(Object.keys(PRIORITY_LABELS) as (keyof typeof PRIORITY_LABELS)[]).map((k) => ({
                  value: k,
                  label: PRIORITY_LABELS[k],
                }))}
                hint="Drives SLA targets"
              />
            </div>

            <div className="rounded-lg border border-line bg-surface-alt/60 p-4">
              <p className="text-[13px] font-medium text-ink">Equipment (optional)</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Select
                  label="Linked equipment"
                  placeholder="None / not listed"
                  value={form.equipmentId}
                  onChange={(e) => set("equipmentId", e.target.value)}
                  options={equipmentForSite.map((eq) => ({
                    value: eq.id,
                    label: `${eq.model} · ${eq.serialNumber}`,
                  }))}
                  disabled={equipmentForSite.length === 0}
                />
                <Select
                  label="Warranty status"
                  value={form.warrantyStatus ?? "unknown"}
                  onChange={(e) => set("warrantyStatus", e.target.value as NewTicketInput["warrantyStatus"])}
                  options={[
                    { value: "in_warranty", label: "In warranty" },
                    { value: "extended_warranty", label: "Extended warranty" },
                    { value: "out_of_warranty", label: "Out of warranty" },
                    { value: "amc_covered", label: "AMC covered" },
                    { value: "unknown", label: "Unknown" },
                  ]}
                />
                <Input
                  label="Model"
                  value={form.model}
                  onChange={(e) => set("model", e.target.value)}
                  placeholder={selectedEquipment?.model ?? "e.g. VX-5K"}
                />
                <Input
                  label="Serial number"
                  value={form.serialNumber}
                  onChange={(e) => set("serialNumber", e.target.value)}
                  placeholder={selectedEquipment?.serialNumber ?? "e.g. VX5K-2024-01837"}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-line pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => {
                  if (validateStep2()) setStep(3);
                }}
              >
                Review ticket
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <CardHeader title="Review & submit" />
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Customer", selectedCustomer?.name ?? "—"],
                ["Site", selectedSite?.name ?? "—"],
                ["Contact", `${form.contactName} · ${form.contactPhone}`],
                ["Location", `${form.city}, ${form.state} ${form.pincode}`],
                ["Issue", `${form.category} (${form.categoryGroup})`],
                ["Priority", PRIORITY_LABELS[form.priority]],
                ["Error code", form.errorCode || "—"],
                ["Warranty", (form.warrantyStatus ?? "unknown").replace(/_/g, " ")],
                ["Equipment", form.model || selectedEquipment?.model || "Not linked"],
                ["Serial", form.serialNumber || selectedEquipment?.serialNumber || "—"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface-alt/60 px-3.5 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-ink-faint">{k}</p>
                  <p className="mt-0.5 text-[13px] font-medium text-ink">{v}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-line px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Description</p>
              <p className="mt-1 text-[13px] leading-6 text-ink-soft">{form.description}</p>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-accent-300/50 bg-accent-100/40 px-4 py-3 text-[13px] leading-5 text-ink-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
              On submit: status becomes <strong>New</strong>, SLA clocks start, OEM + platform
              roles get in-app notifications (demo — no real email/SMS is sent).
            </div>

            <div className="flex items-center justify-between border-t border-line pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={submit} loading={saving}>
                <Send className="h-4 w-4" /> Create ticket
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
