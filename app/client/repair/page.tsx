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
  BATTERY_BRANDS,
  BATTERY_PROBLEM_CATEGORIES,
  INVERTER_BRANDS,
  REPAIR_PRODUCT_TYPES,
  REPAIR_PROBLEM_CATEGORIES,
  REPAIR_SERVICE_MODES,
  repairCapacityMeta,
} from "@/lib/constants";
import { activeRepairCompanies } from "@/lib/selectors";
import { cn } from "@/lib/utils";
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
 * Tapping a company opens a compact request dialog immediately. The form asks
 * only for the essentials a service ticket needs — who, where, which inverter
 * and what is wrong — so it fits in a single view with no page scrolling.
 */
export default function ClientRepairRequestPage() {
  const router = useRouter();
  const { state, createRepairRequest, toast } = useStore();

  const customer = useActiveCustomer();
  const companies = useMemo(() => activeRepairCompanies(state), [state]);

  const [companyId, setCompanyId] = useState("");
  const [productType, setProductType] = useState<"inverter" | "battery" | "other">("inverter");
  const [formOpen, setFormOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [capacity, setCapacity] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [problemCategory, setProblemCategory] = useState("");
  const [description, setDescription] = useState("");
  const [serviceMode, setServiceMode] = useState("on_site");
  const [remarks, setRemarks] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<{ ref: string; id: string; companyName: string } | null>(null);

  const selectedCompany = companies.find((p) => p.id === companyId);
  const brandOptions =
    productType === "battery"
      ? BATTERY_BRANDS
      : productType === "other"
        ? ["Generic", "Other"]
        : INVERTER_BRANDS;
  const faultOptions =
    productType === "battery"
      ? BATTERY_PROBLEM_CATEGORIES
      : productType === "other"
        ? ["Not working", "Physical damage", "Other"]
        : REPAIR_PROBLEM_CATEGORIES;
  const capMeta = repairCapacityMeta(productType);

  /* Prefill just the contact block from the signed-in customer. */
  const prefill = () => {
    if (!customer) return;
    setContactName((v) => v || customer.name);
    setContactCompany((v) => v || customer.company || "");
    setContactPhone((v) => v || customer.phone);
    setCity((v) => v || customer.city);
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
      router.push("/client/login?next=/client/repair");
      return;
    }
    const capacityNum = capacity.trim() ? Number(capacity) : undefined;
    const result = createRepairRequest({
      customerId: customer.id,
      companyId,
      productType,
      contactName,
      contactPhone,
      contactCompany: contactCompany.trim() || undefined,
      address,
      city,
      brand,
      model: model.trim() || undefined,
      capacityKw: Number.isFinite(capacityNum) ? capacityNum : undefined,
      problemCategory,
      description,
      errorCode: remarks.trim() || undefined,
      serviceMode,
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
    if (!customer) {
      toast("Sign in to request a repair", { tone: "info" });
      router.push("/client/login?next=/client/repair");
      return;
    }
    setCompanyId(id);
    setErrors({});
    setFormOpen(true);
    if (!contactName) prefill();
  };

  const pickProduct = (value: "inverter" | "battery" | "other") => {
    setProductType(value);
    setBrand("");
    setProblemCategory("");
    setErrors({});
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
            Repair Service
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
            Repair Service
          </span>
          <h1 className="mt-2.5 text-xl font-bold tracking-tight sm:text-2xl">
            Get your equipment repaired
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-white/75">
            Inverter, battery or other equipment — pick a verified repair company and the form opens right away.
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
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5">
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
            Browse freely — you will be asked to sign in when you tap a company.
          </p>
        </Card>
      )}

      {/* Compact ticket-style request form — opens the instant a company is tapped */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Create repair request"
        description={`${selectedCompany?.name ?? "Repair company"} · tell us the fault below.`}
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
              Cancel
            </Button>
            <Button onClick={submit}>
              Submit request <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {/* Selected company */}
          {selectedCompany && (
            <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-alt/60 p-2">
              <div className="relative h-8 w-10 shrink-0 overflow-hidden rounded border border-line bg-white">
                {(selectedCompany.image ?? selectedCompany.logoUrl) ? (
                  <Image
                    src={selectedCompany.image ?? selectedCompany.logoUrl ?? ""}
                    alt={`${selectedCompany.name} logo`}
                    fill
                    sizes="40px"
                    className="object-contain p-0.5"
                    unoptimized={(selectedCompany.image ?? selectedCompany.logoUrl ?? "").startsWith("data:")}
                  />
                ) : (
                  <Wrench className="absolute inset-0 m-auto h-4 w-4 text-ink-faint" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-ink">{selectedCompany.name}</p>
                <p className="flex items-center gap-2 text-[10.5px] text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" aria-hidden /> {selectedCompany.city}, {selectedCompany.state}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 fill-warning-400 text-warning-400" aria-hidden />
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
                className="shrink-0 text-[11px] font-medium text-brand-700 hover:underline"
              >
                Change
              </button>
            </div>
          )}
          {field("companyId") && <p className="text-xs text-danger-600">{field("companyId")}</p>}

          {/* Equipment family */}
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              Equipment
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {REPAIR_PRODUCT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => pickProduct(t.value)}
                  aria-pressed={productType === t.value}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-[11.5px] font-medium transition-colors",
                    productType === t.value
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-line bg-surface text-ink-muted hover:border-brand-300",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer information */}
          <fieldset>
            <legend className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              Customer information
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
                id="repair-contact-company"
                label="Company name (optional)"
                value={contactCompany}
                onChange={(e) => setContactCompany(e.target.value)}
                placeholder="Company name"
              />
              <Input
                id="repair-contact-name"
                label="Complaint raised by"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Customer name"
                error={field("contactName")}
              />
            </div>
            <div className="mt-2">
              <Input
                id="repair-contact-phone"
                label="Mobile number"
                required
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Customer mobile number"
                error={field("contactPhone")}
              />
            </div>
          </fieldset>

          {/* Inverter details */}
          <fieldset>
            <legend className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              Inverter details
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <Select
                id="repair-brand"
                label="Brand name"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Select brand"
                options={brandOptions.map((b) => ({ value: b, label: b }))}
                error={field("brand")}
              />
              <Input
                id="repair-model"
                label="Model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={productType === "battery" ? "e.g. LFP-100-48V" : "e.g. PVS50KWTL"}
              />
              <Input
                id="repair-capacity"
                label={capMeta.label}
                type="number"
                min={0}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder={capMeta.placeholder}
                error={field("capacityKw")}
              />
              <Input
                id="repair-city"
                label="City"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                error={field("city")}
              />
              <div className="col-span-2">
                <Input
                  id="repair-address"
                  label="Inverter location"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Pickup/installation location (full address)"
                  error={field("address")}
                />
              </div>
            </div>
          </fieldset>

          {/* Fault details */}
          <fieldset>
            <legend className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              Fault details
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <Select
                id="repair-problem-category"
                label="Fault type"
                required
                value={problemCategory}
                onChange={(e) => setProblemCategory(e.target.value)}
                placeholder="Select fault type"
                options={faultOptions.map((c) => ({ value: c, label: c }))}
                error={field("problemCategory")}
              />
              <Select
                id="repair-service-mode"
                label="Service type"
                value={serviceMode}
                onChange={(e) => setServiceMode(e.target.value)}
                options={REPAIR_SERVICE_MODES.map((m) => ({ value: m.value, label: m.label }))}
              />
              <div className="col-span-2">
                <Textarea
                  id="repair-description"
                  label="Fault description"
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue…"
                  error={field("description")}
                />
              </div>
              <div className="col-span-2">
                <Input
                  id="repair-remarks"
                  label="Remarks (optional)"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any remarks for this ticket…"
                />
              </div>
            </div>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[11.5px] font-medium text-ink-muted transition-colors hover:text-brand-700">
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
          </fieldset>

          <p className="flex items-start gap-2 border-t border-line pt-2 text-[10.5px] leading-4 text-ink-faint">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Shared only with the company you picked. Warranty decisions stay with the manufacturer.
          </p>
        </div>
      </Modal>
    </div>
  );
}
