"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Info,
  MapPin,
  Paperclip,
  ShieldCheck,
  Star,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/states";
import { RepairCompanyCard } from "@/components/repair/repair-company-card";

/**
 * Inverter repair directory + request form (public client app).
 *
 * The repair company directory is public: guests browse the same vendors and
 * can fill this form. Authentication is only checked on submit — anonymous
 * visitors are sent to sign-in and returned here afterwards.
 *
 * Tapping a company opens a compact, single-view request dialog immediately —
 * the form does not sit further down the page, so there is nothing to scroll
 * to find it.
 */
export default function ClientRepairRequestPage() {
  const router = useRouter();
  const { state, createRepairRequest, toast } = useStore();

  const customer = useActiveCustomer();
  const companies = useMemo(() => activeRepairCompanies(state), [state]);

  const [companyId, setCompanyId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
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

  const selectedCompany = companies.find((p) => p.id === companyId);

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
    if (!customer) {
      // Browsing and filling the form is public; only sending needs an account.
      router.push("/client/login?next=/client/repair");
      return;
    }
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
    setFormOpen(false);
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
  const openForm = (id: string) => {
    setCompanyId(id);
    setErrors((e) => ({ ...e, companyId: "" }));
    setFormOpen(true);
    if (customer && !contactName) prefill();
  };

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
        <div className="flex items-center gap-2">
          {customer && (
            <Link
              href="/client/repairs"
              className="text-[13px] font-medium text-brand-700 hover:underline"
            >
              My requests
            </Link>
          )}
          <Badge tone="blue" className="ring-brand-100">
            Inverter Repair
          </Badge>
        </div>
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
            Pick a verified repair company — the request form opens right away.
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
        <Card>
          <CardHeader
            title="Choose a repair company"
            description={`${companies.length} verified RAYVIQ repair vendors — tap one to open its request form.`}
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {companies.map((p) => (
              <RepairCompanyCard
                key={p.id}
                partner={p}
                selected={companyId === p.id && formOpen}
                onSelect={() => openForm(p.id)}
              />
            ))}
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-faint">
            <Info className="h-3 w-3" aria-hidden />
            No sign-in needed to browse — you will be asked to sign in only when you send.
          </p>
        </Card>
      )}

      {/* Request form — opens the instant a company is tapped */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={`Request repair · ${selectedCompany?.name ?? "company"}`}
        description="Tell us the fault — the company gets this instantly."
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                setCompanyId("");
              }}
            >
              Change company
            </Button>
            <Button onClick={submit}>
              Submit request <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {/* Selected company strip */}
          {selectedCompany && (
            <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/70 p-2.5">
              <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
                {(selectedCompany.image ?? selectedCompany.logoUrl) ? (
                  <Image
                    src={selectedCompany.image ?? selectedCompany.logoUrl ?? ""}
                    alt={`${selectedCompany.name} logo`}
                    fill
                    sizes="56px"
                    className="object-contain p-1"
                    unoptimized={(selectedCompany.image ?? selectedCompany.logoUrl ?? "").startsWith("data:")}
                  />
                ) : (
                  <Wrench className="absolute inset-0 m-auto h-5 w-5 text-ink-faint" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">{selectedCompany.name}</p>
                <p className="flex items-center gap-2 text-[11px] text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" aria-hidden />
                    {selectedCompany.city}, {selectedCompany.state}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-warning-400 text-warning-400" aria-hidden />
                    {selectedCompany.rating.toFixed(1)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setCompanyId("");
                }}
                className="shrink-0 text-[11.5px] font-medium text-brand-700 hover:underline"
              >
                Change
              </button>
            </div>
          )}
          {field("companyId") && (
            <p className="text-xs text-danger-600">{field("companyId")}</p>
          )}

          {/* Contact & address */}
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              Contact & visit address
              {customer && (
                <button
                  type="button"
                  onClick={prefill}
                  className="ml-2 normal-case tracking-normal text-brand-700 hover:underline"
                >
                  Use my profile
                </button>
              )}
            </legend>
            <div className="grid grid-cols-2 gap-2">
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
                id="repair-city"
                label="City"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Jaipur"
                error={field("city")}
              />
              <div className="col-span-2">
                <Input
                  id="repair-address"
                  label="Address"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, area, landmark"
                  error={field("address")}
                />
              </div>
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
          </fieldset>

          {/* Inverter */}
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              Inverter details
            </legend>
            <div className="grid grid-cols-2 gap-2">
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
              <Input
                id="repair-serial"
                label="Serial number"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Optional"
              />
              <Input
                id="repair-year"
                label="Installed year"
                value={yearOfInstallation}
                onChange={(e) => setYearOfInstallation(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </fieldset>

          {/* Problem */}
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              What is wrong?
            </legend>
            <div className="grid grid-cols-2 gap-2">
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
              <Select
                id="repair-service-mode"
                label="Service mode"
                value={serviceMode}
                onChange={(e) => setServiceMode(e.target.value)}
                options={REPAIR_SERVICE_MODES.map((m) => ({ value: m.value, label: m.label }))}
              />
              <div className="col-span-2">
                <Textarea
                  id="repair-description"
                  label="Describe the problem"
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Trips on over-voltage every afternoon and stops generating…"
                  error={field("description")}
                />
              </div>
              <Input
                id="repair-error-code"
                label="Error code"
                value={errorCode}
                onChange={(e) => setErrorCode(e.target.value)}
                placeholder="Optional · e.g. F-23"
              />
              <Input
                id="repair-preferred-date"
                label="Preferred date"
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[12px] font-medium text-ink-soft transition-colors hover:border-brand-400 hover:bg-brand-50/40">
                <Paperclip className="h-3.5 w-3.5" aria-hidden />
                {attachmentName || "Attach a photo (optional)"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) setAttachmentName(file.name);
                    e.target.value = "";
                  }}
                />
              </label>
              {attachmentName && (
                <button
                  type="button"
                  onClick={() => setAttachmentName("")}
                  className="text-[11.5px] text-ink-faint hover:text-danger-600"
                >
                  Remove
                </button>
              )}
            </div>
          </fieldset>

          <p className="flex items-start gap-2 border-t border-line pt-2.5 text-[11px] leading-4 text-ink-faint">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Shared only with the company you picked. Warranty decisions stay with the manufacturer.
          </p>
        </div>
      </Modal>
    </div>
  );
}
