"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Info,
  MapPin,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useActiveCustomer } from "@/lib/session";
import {
  INVERTER_BRANDS,
  PRODUCT_CATEGORY_LABELS,
  REPAIR_PROBLEM_CATEGORIES,
  REPAIR_SERVICE_MODES,
} from "@/lib/constants";
import { activeRepairCompanies } from "@/lib/selectors";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FileUpload, Input, Select, Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { RepairCompanyCard } from "@/components/repair/repair-company-card";

/**
 * Inverter repair directory + request form (public client app).
 *
 * The repair company directory is public: guests browse the same vendors as
 * signed-in customers. Only sending a request needs a customer session, so
 * the form is replaced by a sign-in CTA for anonymous visitors.
 */
export default function ClientRepairRequestPage() {
  const { state, createRepairRequest, toast } = useStore();

  const customer = useActiveCustomer();
  const companies = useMemo(() => activeRepairCompanies(state), [state]);

  const [companyId, setCompanyId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [capacity, setCapacity] = useState("");
  const [category, setCategory] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [yearOfInstallation, setYearOfInstallation] = useState("");
  const [problemCategory, setProblemCategory] = useState("");
  const [description, setDescription] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [serviceMode, setServiceMode] = useState("on_site");
  const [preferredDate, setPreferredDate] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<{ ref: string; id: string; companyName: string } | null>(null);

  /* Prefill the contact block from the signed-in customer. */
  const prefill = () => {
    if (!customer) return;
    setContactName((v) => v || customer.name);
    setContactPhone((v) => v || customer.phone);
    setContactEmail((v) => v || customer.email || "");
    setCity((v) => v || customer.city);
    setStateName((v) => v || customer.state);
    setPincode((v) => v || customer.pincode);
  };

  if (created) {
    return (
      <div className="space-y-4">
        <Card className="p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 className="h-6 w-6 text-green-600" aria-hidden />
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink">
            Repair request sent
          </h2>
          <p className="mt-1 text-[13px] text-ink-muted">
            Reference{" "}
            <span className="font-mono font-medium text-brand-700">{created.ref}</span> · sent to{" "}
            <span className="font-medium text-ink-soft">{created.companyName}</span>
          </p>
          <p className="mx-auto mt-3 max-w-sm text-[12.5px] leading-6 text-ink-muted">
            The repair company has received your request. You will see the status change the
            moment they accept it.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/client/repairs/${created.id}`}>
              <Button>
                <ClipboardList className="h-4 w-4" aria-hidden /> Track this request
              </Button>
            </Link>
            <Link href="/client/repairs">
              <Button variant="outline">All my repair requests</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const submit = () => {
    if (!customer) return; // guests browse only — the store also enforces this
    const capacityNum = capacity.trim() ? Number(capacity) : undefined;
    const result = createRepairRequest({
      customerId: customer.id,
      companyId,
      contactName,
      contactPhone,
      contactEmail: contactEmail.trim() || undefined,
      address,
      city,
      state: stateName.trim() || undefined,
      pincode: pincode.trim() || undefined,
      brand,
      model: model.trim() || undefined,
      capacityKw: Number.isFinite(capacityNum) ? capacityNum : undefined,
      category: category || undefined,
      serialNumber: serialNumber.trim() || undefined,
      yearOfInstallation: yearOfInstallation.trim() || undefined,
      problemCategory,
      description,
      errorCode: errorCode.trim() || undefined,
      serviceMode,
      preferredDate: preferredDate || undefined,
      attachmentName: attachmentName || undefined,
    });

    if (!result.ok || !result.request) {
      setErrors(result.errors ?? {});
      toast("Please fix the highlighted fields", { tone: "error" });
      return;
    }

    setErrors({});
    const company = state.partners.find((p) => p.id === companyId);
    setCreated({
      ref: result.request.ref,
      id: result.request.id,
      companyName: company?.name ?? "the repair company",
    });
    toast("Repair request sent", {
      description: `${result.request.ref} — the repair company has been notified.`,
    });
  };

  const field = (name: string) => errors[name];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/client"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Home
        </Link>
        <Badge tone="blue" className="ring-brand-100">
          Inverter Repair
        </Badge>
      </div>

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink via-brand-900 to-brand-800 p-4 text-white sm:p-5">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand-500/30 blur-3xl" />
        </div>
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/20">
            <Wrench className="h-3 w-3 text-accent-400" aria-hidden />
            Inverter Repair Service
          </span>
          <h1 className="mt-2.5 text-xl font-bold tracking-tight sm:text-2xl">
            Get your inverter repaired
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-white/75">
            Pick a verified repair company, describe the fault and track the job end to end.
          </p>
        </div>
      </section>

      {companies.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={<Wrench className="h-5 w-5" />}
            title="No repair companies listed"
            description="No repair partner is accepting requests right now. Please check back shortly."
          />
        </Card>
      ) : (
        <>
          {/* ---------- 1. Choose a company ---------- */}
          <Card>
            <CardHeader
              title={customer ? "1. Choose a repair company" : "Browse repair vendors"}
              description={
                customer
                  ? `${companies.length} verified RAYVIQ repair vendors — pick the one that fits your inverter.`
                  : `${companies.length} verified repair vendors — browse freely, no sign-in needed.`
              }
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((p) => (
                <RepairCompanyCard
                  key={p.id}
                  partner={p}
                  selected={companyId === p.id}
                  onSelect={() => {
                    setCompanyId(p.id);
                    setErrors((e) => ({ ...e, companyId: "" }));
                  }}
                />
              ))}
            </div>
            {field("companyId") && (
              <p className="mt-2 text-xs text-danger-600">{field("companyId")}</p>
            )}
          </Card>

          {customer ? (
            <>
          {/* ---------- 2. Contact ---------- */}
          <Card>
            <CardHeader
              title="2. Where should the team come?"
              description="Contact details for the repair visit — the company calls before arriving."
              action={
                <button
                  type="button"
                  onClick={prefill}
                  className="text-[12px] font-medium text-brand-700 hover:underline"
                >
                  Use my profile details
                </button>
              }
            />
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="repair-contact-name"
                  label="Contact person"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Full name"
                  error={field("contactName")}
                />
                <Input
                  id="repair-contact-phone"
                  label="Contact number"
                  required
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 98870 51001"
                  error={field("contactPhone")}
                />
              </div>
              <Input
                id="repair-contact-email"
                label="Email (optional)"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@example.com"
                error={field("contactEmail")}
              />
              <Input
                id="repair-address"
                label="Address"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, area, landmark"
                error={field("address")}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  id="repair-city"
                  label="City"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Jaipur"
                  error={field("city")}
                />
                <Input
                  id="repair-state"
                  label="State"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="Rajasthan"
                />
                <Input
                  id="repair-pincode"
                  label="Pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="302013"
                />
              </div>
            </div>
          </Card>

          {/* ---------- 3. Inverter ---------- */}
          <Card>
            <CardHeader
              title="3. Inverter details"
              description="The more you share, the faster the company can order the right spare."
            />
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  id="repair-brand"
                  label="Brand"
                  required
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Select a brand…"
                  options={INVERTER_BRANDS.map((b) => ({ value: b, label: b }))}
                  error={field("brand")}
                />
                <Select
                  id="repair-category"
                  label="Inverter type"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Not sure"
                  options={Object.entries(PRODUCT_CATEGORY_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="repair-model"
                  label="Model number"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. VTX-3P-110K"
                />
                <Input
                  id="repair-capacity"
                  label="Capacity (kW)"
                  type="number"
                  min={0}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="e.g. 110"
                  error={field("capacityKw")}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="repair-serial"
                  label="Serial number (optional)"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="e.g. VTX110K2400193"
                />
                <Input
                  id="repair-year"
                  label="Year of installation (optional)"
                  value={yearOfInstallation}
                  onChange={(e) => setYearOfInstallation(e.target.value)}
                  placeholder="e.g. 2025"
                />
              </div>
            </div>
          </Card>

          {/* ---------- 4. Problem ---------- */}
          <Card>
            <CardHeader
              title="4. What is wrong with it?"
              description="Describe the symptoms, error codes and when they started."
            />
            <div className="space-y-4">
              <Select
                id="repair-problem-category"
                label="Problem category"
                required
                value={problemCategory}
                onChange={(e) => setProblemCategory(e.target.value)}
                placeholder="Select a category…"
                options={REPAIR_PROBLEM_CATEGORIES.map((c) => ({ value: c, label: c }))}
                error={field("problemCategory")}
              />
              <Textarea
                id="repair-description"
                label="Describe the problem"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Inverter trips on over-voltage every afternoon around 15:00 and stops generating for 20 minutes…"
                error={field("description")}
              />
              <Input
                id="repair-error-code"
                label="Error code (optional)"
                value={errorCode}
                onChange={(e) => setErrorCode(e.target.value)}
                placeholder="e.g. F-23"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  id="repair-service-mode"
                  label="How should it be serviced?"
                  value={serviceMode}
                  onChange={(e) => setServiceMode(e.target.value)}
                  options={REPAIR_SERVICE_MODES.map((m) => ({ value: m.value, label: m.label }))}
                />
                <Input
                  id="repair-preferred-date"
                  label="Preferred date (optional)"
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              </div>
              <FileUpload
                label="Attach a photo (optional)"
                hint="A photo of the fault screen or the inverter helps a lot"
                accept="image/*"
                onFiles={(names) => setAttachmentName(names[0] ?? "")}
              />
              {attachmentName && (
                <p className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-600" aria-hidden />
                  {attachmentName}
                </p>
              )}
            </div>
          </Card>

          {/* ---------- Submit ---------- */}
          <Card className="p-4 sm:p-5">
            <p className="flex items-start gap-2 text-[12px] leading-5 text-ink-faint">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Your request is shared only with the repair company you select. Warranty and
              replacement decisions remain with the inverter manufacturer.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <p className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                <Info className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                {companyId
                  ? `Sending to ${state.partners.find((p) => p.id === companyId)?.name}`
                  : "Select a repair company to continue"}
              </p>
              <Button size="lg" onClick={submit} disabled={!companyId}>
                Submit repair request <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </Card>

          <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-[11.5px] text-ink-faint">
            <MapPin className="h-3 w-3" aria-hidden />
            Serving {customer.city}, {customer.state}
            {preferredDate ? ` · preferred ${formatDate(preferredDate)}` : ""}
            <CalendarClock className="h-3 w-3" aria-hidden />
          </p>
            </>
          ) : (
            <Card className="p-5">
              <EmptyState
                icon={<UserRound className="h-5 w-5" />}
                title="Sign in to send a repair request"
                description="You can browse every repair vendor above without an account. Sign in as a customer to describe your issue and send a request."
                action={
                  <Link href="/client/login">
                    <Button>Sign in to continue</Button>
                  </Link>
                }
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
