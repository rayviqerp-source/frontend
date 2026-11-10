"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Check,
  CheckCircle2,
  FileText,
  ListChecks,
  UserPlus,
  Users,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { usePartnerScope } from "@/components/vendor/scope";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/constants";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Checkbox, FileUpload, Input, Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import type { EngineerDocument } from "@/lib/types";

const STEP_LABELS = ["Personal", "Skills", "Documents", "Payout & capacity", "Review"] as const;

const SKILL_PRESETS = [
  "Inverter repair",
  "AC/DC fault tracing",
  "Panel & string testing",
  "Battery storage systems",
  "Earthing & lightning protection",
  "AMC maintenance",
  "Wiring & connectors",
  "SCADA / monitoring",
  "Thermal imaging inspection",
  "Cleaning & upkeep",
];

const LANGUAGE_PRESETS = ["Hindi", "English", "Marathi", "Gujarati", "Rajasthani", "Tamil", "Kannada"];

const DOC_FIELDS = [
  { key: "identity", label: "Aadhaar / Identity proof", type: "identity", required: true },
  { key: "qualification", label: "Electrical qualification certificate", type: "qualification", required: true },
  { key: "pan", label: "PAN card", type: "identity", required: false },
  { key: "bank", label: "Bank account proof", type: "bank", required: false },
] as const;

type DocKey = (typeof DOC_FIELDS)[number]["key"];

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  city: "",
  state: "",
  pincode: "",
  address: "",
  experienceYears: 2,
  skills: [] as string[],
  productExpertise: [] as string[],
  certifications: "",
  languages: ["Hindi", "English"] as string[],
  bankProvided: false,
  serviceRadiusKm: 30,
  maxLoad: 3,
};

export default function VendorOnboardingPage() {
  const { addEngineer } = useStore();
  const { partner, engineers } = usePartnerScope();

  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [docs, setDocs] = useState<Record<DocKey, string[]>>({
    identity: [],
    qualification: [],
    pan: [],
    bank: [],
  });

  if (!partner) {
    return (
      <div>
        <PageHeader title="Onboard engineer" breadcrumbs={<Breadcrumbs />} />
        <Card>
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="No service partner linked"
            description="Sign in as Neha (USR-05 · BrightField) to onboard engineers for your team."
          />
        </Card>
      </div>
    );
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  };

  const toggle = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const validate = (): boolean => {
    if (step === 1) {
      if (!form.name.trim() || !form.phone.trim() || !form.city.trim() || !form.state.trim()) {
        setError("Name, phone, city and state are required.");
        return false;
      }
      if (form.languages.length === 0) {
        setError("Pick at least one spoken language.");
        return false;
      }
    }
    if (step === 2) {
      if (form.skills.length === 0) {
        setError("Select at least one skill — this drives OEM matching.");
        return false;
      }
      if (form.productExpertise.length === 0) {
        setError("Select at least one product category.");
        return false;
      }
    }
    if (step === 3) {
      if (docs.identity.length === 0 || docs.qualification.length === 0) {
        setError("Identity proof and qualification certificate are mandatory.");
        return false;
      }
    }
    if (step === 4) {
      if (!form.bankProvided) {
        setError("Confirm the bank details are submitted — payouts depend on it.");
        return false;
      }
      if (form.serviceRadiusKm < 5 || form.maxLoad < 1) {
        setError("Service radius must be ≥ 5 km and max load ≥ 1 job.");
        return false;
      }
    }
    setError("");
    return true;
  };

  const next = () => {
    if (!validate()) return;
    setStep((s) => Math.min(5, s + 1));
  };

  const back = () => {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  };

  const submit = () => {
    if (!validate()) return;
    const now = new Date().toISOString();
    const documents: EngineerDocument[] = DOC_FIELDS.map((f) => ({
      id: `DOC-${f.key.toUpperCase()}`,
      label: f.label,
      type: f.type,
      status: docs[f.key].length > 0 ? "pending" : "missing",
      uploadedAt: docs[f.key].length > 0 ? now : undefined,
    }));

    addEngineer({
      partnerId: partner.id,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || "—",
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim() || "—",
      address: form.address.trim(),
      experienceYears: form.experienceYears,
      languages: form.languages,
      skills: form.skills,
      productExpertise: form.productExpertise,
      certifications: form.certifications
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      serviceRadiusKm: form.serviceRadiusKm,
      maxLoad: form.maxLoad,
      documents,
      bankDetailsProvided: form.bankProvided,
      onboardingStep: 5,
    });
    setSubmittedName(form.name.trim());
    setDone(true);
  };

  /* ---------------- success screen ---------------- */
  if (done) {
    return (
      <div>
        <PageHeader title="Onboard engineer" breadcrumbs={<Breadcrumbs />} />
        <Card>
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-50 text-success-600">
              <CheckCircle2 className="h-7 w-7" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink">
              {submittedName} submitted for verification
            </h2>
            <p className="mt-2 max-w-md text-[13px] leading-6 text-ink-muted">
              The profile entered the RAYVIQ verification queue. Once approved, {submittedName.split(" ")[0]} appears
              in the OEM Engineer Network, starts receiving dispatch offers and gets listed on the public marketplace.
            </p>
            <div className="mt-3">
              <VerificationBadge status="submitted" />
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href="/vendor/engineers">
                <Button>
                  <Users className="h-4 w-4" aria-hidden /> View team
                </Button>
              </Link>
              <Link href="/vendor/onboarding">
                <Button variant="outline" onClick={() => {
                  setForm({ ...emptyForm });
                  setDocs({ identity: [], qualification: [], pan: [], bank: [] });
                  setStep(1);
                  setDone(false);
                }}>
                  <UserPlus className="h-4 w-4" aria-hidden /> Onboard another
                </Button>
              </Link>
            </div>
            <p className="mt-6 rounded-lg border border-line bg-surface-alt px-4 py-2.5 text-[12px] text-ink-muted">
              Demo note — the record is created locally; no real KYC or email is triggered. Team size is now{" "}
              {engineers.length + 1}.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  /* ---------------- wizard ---------------- */
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Onboard engineer"
        description={`Add a technician to ${partner.name} — profile, KYC and capacity, straight into the RAYVIQ verification queue.`}
        breadcrumbs={<Breadcrumbs />}
        actions={<Badge tone="cyan">{step} of 5</Badge>}
      />

      {/* Step indicator */}
      <div className="mb-5">
        <div className="flex gap-1.5">
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              className={`h-1.5 flex-1 rounded-full ${
                i + 1 < step ? "bg-success-500" : i + 1 === step ? "bg-brand-600" : "bg-line"
              }`}
            />
          ))}
        </div>
        <ol className="mt-2 grid gap-1 text-[11px] sm:grid-cols-5">
          {STEP_LABELS.map((label, i) => (
            <li
              key={label}
              className={
                i + 1 < step
                  ? "font-medium text-success-700"
                  : i + 1 === step
                    ? "font-semibold text-brand-700"
                    : "text-ink-faint"
              }
            >
              {i + 1 < step && <Check className="mr-1 inline h-3 w-3" aria-hidden />}
              {label}
            </li>
          ))}
        </ol>
      </div>

      <Card>
        <div className="p-5">
          {/* -------- Step 1: personal -------- */}
          {step === 1 && (
            <div className="space-y-4">
              <CardHeader
                title="Personal details"
                description="How OEMs and customers reach the technician."
                action={<UserPlus className="h-4 w-4 text-ink-faint" aria-hidden />}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Full name" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Ravi Meena" />
                <Input label="Phone" required value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98xxx xxxxx" />
                <Input label="Email" type="email" hint="Optional" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="tech@example.com" />
                <Input label="Experience (years)" type="number" min={0} value={String(form.experienceYears)} onChange={(e) => set("experienceYears", Number(e.target.value) || 0)} />
                <Input label="City" required value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Jaipur" />
                <Input label="State" required value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="Rajasthan" />
                <Input label="Pincode" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} placeholder="302001" />
                <Input label="Service radius (km)" type="number" min={5} value={String(form.serviceRadiusKm)} onChange={(e) => set("serviceRadiusKm", Number(e.target.value) || 0)} hint="Area of operation around base city" />
              </div>
              <Textarea label="Address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="House no., street, landmark" />
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-ink">
                  Languages spoken <span className="text-danger-600">*</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_PRESETS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => set("languages", toggle(form.languages, l))}
                      className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        form.languages.includes(l)
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-line text-ink-soft hover:bg-surface-alt"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* -------- Step 2: skills -------- */}
          {step === 2 && (
            <div className="space-y-4">
              <CardHeader
                title="Skills & product expertise"
                description="Drives recommendation matching when OEMs dispatch tickets."
                action={<ListChecks className="h-4 w-4 text-ink-faint" aria-hidden />}
              />
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-ink">
                  Skills <span className="text-danger-600">*</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {SKILL_PRESETS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set("skills", toggle(form.skills, s))}
                      className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        form.skills.includes(s)
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-line text-ink-soft hover:bg-surface-alt"
                      }`}
                    >
                      {form.skills.includes(s) && <Check className="mr-1 inline h-3 w-3" aria-hidden />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-ink">
                  Product expertise <span className="text-danger-600">*</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PRODUCT_CATEGORY_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set("productExpertise", toggle(form.productExpertise, key))}
                      className={`rounded-lg border px-3 py-2 text-[12px] font-medium transition-colors ${
                        form.productExpertise.includes(key)
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-line text-ink-soft hover:bg-surface-alt"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                label="Certifications"
                hint="Comma separated"
                value={form.certifications}
                onChange={(e) => set("certifications", e.target.value)}
                placeholder="ITI Electrician, NABH solar installer, OEM training certificate"
              />
            </div>
          )}

          {/* -------- Step 3: documents -------- */}
          {step === 3 && (
            <div className="space-y-4">
              <CardHeader
                title="KYC documents"
                description="Files stay in this demo only — statuses start as pending for the verification desk."
                action={<FileText className="h-4 w-4 text-ink-faint" aria-hidden />}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {DOC_FIELDS.map((f) => (
                  <div key={f.key} className="rounded-lg border border-line bg-surface-alt p-3">
                    <p className="mb-2 flex items-center justify-between text-[13px] font-medium text-ink">
                      {f.label}
                      {f.required ? (
                        <span className="text-[11px] font-normal text-danger-600">Required</span>
                      ) : (
                        <span className="text-[11px] font-normal text-ink-faint">Optional</span>
                      )}
                    </p>
                    {docs[f.key].length > 0 ? (
                      <div className="space-y-1.5">
                        {docs[f.key].map((n) => (
                          <p key={n} className="flex items-center justify-between gap-2 rounded-md bg-surface px-2.5 py-1.5 text-[12px] text-ink-soft">
                            <span className="truncate">{n}</span>
                            <button
                              type="button"
                              onClick={() => setDocs((d) => ({ ...d, [f.key]: [] }))}
                              className="shrink-0 font-medium text-danger-600 hover:text-danger-700"
                            >
                              Remove
                            </button>
                          </p>
                        ))}
                        <FileUpload
                          label="Replace"
                          onFiles={(names) => setDocs((d) => ({ ...d, [f.key]: names }))}
                        />
                      </div>
                    ) : (
                      <FileUpload
                        onFiles={(names) => {
                          setDocs((d) => ({ ...d, [f.key]: names }));
                          setError("");
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -------- Step 4: payout & capacity -------- */}
          {step === 4 && (
            <div className="space-y-4">
              <CardHeader
                title="Payout & capacity"
                description="Used for dispatch decisions and settlement (demo only)."
                action={<Banknote className="h-4 w-4 text-ink-faint" aria-hidden />}
              />
              <div className="rounded-lg border border-line bg-surface-alt p-4">
                <Checkbox
                  checked={form.bankProvided}
                  onChange={(v) => {
                    set("bankProvided", v);
                  }}
                  label="Bank account details are submitted for service payouts (account number / IFSC are never captured in this demo)"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Max concurrent jobs"
                  type="number"
                  min={1}
                  max={8}
                  value={String(form.maxLoad)}
                  onChange={(e) => set("maxLoad", Number(e.target.value) || 0)}
                  hint="Offers beyond this load are skipped by the engine"
                />
                <Input
                  label="Service radius (km)"
                  type="number"
                  min={5}
                  value={String(form.serviceRadiusKm)}
                  onChange={(e) => set("serviceRadiusKm", Number(e.target.value) || 0)}
                />
              </div>
              <p className="rounded-lg border border-line bg-surface-alt px-3.5 py-2.5 text-[12px] text-ink-muted">
                New engineers start at <strong className="text-ink">100% acceptance, no load, 0 rating</strong> — scores
                build from their first accepted assignment onwards.
              </p>
            </div>
          )}

          {/* -------- Step 5: review -------- */}
          {step === 5 && (
            <div className="space-y-4">
              <CardHeader
                title="Review & submit"
                description="Everything the verification desk will see."
                action={<BadgeCheck className="h-4 w-4 text-ink-faint" aria-hidden />}
              />
              <dl className="grid gap-2.5 sm:grid-cols-2">
                {[
                  ["Name", form.name],
                  ["Phone", form.phone],
                  ["Email", form.email || "—"],
                  ["Base", `${form.city}, ${form.state} ${form.pincode}`],
                  ["Experience", `${form.experienceYears} years`],
                  ["Languages", form.languages.join(", ")],
                  ["Skills", form.skills.join(", ")],
                  ["Products", form.productExpertise.map((k) => PRODUCT_CATEGORY_LABELS[k]).join(", ")],
                  ["Certifications", form.certifications || "—"],
                  ["Documents", DOC_FIELDS.filter((f) => docs[f.key].length > 0).map((f) => f.label).join(", ") || "—"],
                  ["Service radius", `${form.serviceRadiusKm} km`],
                  ["Max concurrent jobs", String(form.maxLoad)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-line bg-surface-alt px-3 py-2">
                    <dt className="text-[11px] text-ink-faint">{label}</dt>
                    <dd className="mt-0.5 text-[13px] text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex items-center gap-2 rounded-lg border border-success-100 bg-success-50 px-3.5 py-2.5 text-[12px] text-success-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                On submit, this engineer enters the verification queue and becomes visible to OEMs after approval.
              </div>
            </div>
          )}

          {error && <p className="mt-3 text-xs text-danger-600">{error}</p>}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t border-line px-5 py-4">
          <Button variant="outline" onClick={back} disabled={step === 1}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </Button>
          {step < 5 ? (
            <Button onClick={next}>
              Continue <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <Button onClick={submit}>
              <BadgeCheck className="h-4 w-4" aria-hidden /> Submit for verification
            </Button>
          )}
        </div>
      </Card>

      <p className="mt-4 text-center text-[11px] text-ink-faint">
        Partner: {partner.name} · {engineers.length} engineer{engineers.length === 1 ? "" : "s"} currently on the team.
      </p>
    </div>
  );
}
