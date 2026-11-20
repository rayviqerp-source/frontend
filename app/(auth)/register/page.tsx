"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUpload, Input, Select } from "@/components/ui/form";
import { Card, CardHeader } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { REPAIR_SERVICE_MODES, REPAIR_SPECIALITIES, ROLE_LABELS } from "@/lib/constants";
import { registerAccount, uploadCompanyLogo } from "@/lib/api";

/** Workspace roles a self-serve registration may pick (platform staff excluded). */
const ROLE_OPTIONS = [
  { value: "oem_admin", label: "OEM Admin", group: "OEM / company team" },
  { value: "oem_service_manager", label: "Service Manager", group: "OEM / company team" },
  { value: "oem_service_executive", label: "Service Executive", group: "OEM / company team" },
  { value: "partner_manager", label: "Service Partner Manager", group: "Service partner" },
  { value: "engineer", label: "Field Engineer", group: "Service partner" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { addRepairCompany, loginRemoteUser, toast } = useStore();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [form, setForm] = useState({
    company: "",
    name: "",
    email: "",
    phone: "",
    role: "oem_admin",
    password: "",
    city: "",
    state: "",
    turnaround: "",
    specialities: [] as string[],
    serviceModes: [] as string[],
    logoName: "",
    logoDataUrl: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEngineer = form.role === "engineer";
  const isVendor = form.role === "partner_manager";

  const toggle = (key: "specialities" | "serviceModes", value: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!isEngineer && !form.company.trim()) errs.company = "Company name is required";
    if (isEngineer && form.company.length > 0 && !form.company.trim())
      errs.company = "Enter a valid company / partner name or leave it blank";
    if (!form.name.trim()) errs.name = "Full name is required";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.email = "Enter a valid email";
    if (form.phone.replace(/\D/g, "").length < 10) errs.phone = "Enter a valid phone number";
    if (form.password.length < 8) errs.password = "Minimum 8 characters";
    if (isVendor) {
      if (!form.city.trim()) errs.city = "City is required for the public repair directory";
      if (form.specialities.length === 0)
        errs.specialities = "Select at least one inverter type you repair";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    /* Create the real account in MongoDB via the backend. */
    setSubmitting(true);
    setServerError("");
    try {
      /* Vendors also appear in the public repair directory. */
      if (isVendor) {
        const logoUrl = form.logoDataUrl
          ? await uploadCompanyLogo({
              name: form.logoName,
              dataUrl: form.logoDataUrl,
              partnerId: form.company.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            })
          : undefined;
        addRepairCompany({
          name: form.company.trim(),
          contactName: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          city: form.city.trim(),
          state: form.state.trim() || "—",
          repairSpecialities: form.specialities,
          serviceModes: form.serviceModes.length ? form.serviceModes : ["on_site"],
          avgTurnaround: form.turnaround.trim() || "48–72 hrs",
          ...(logoUrl ? { logoUrl } : {}),
        });
      }

      const session = await registerAccount({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        company: form.company.trim(),
        phone: form.phone.trim(),
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
      });
      /* Make the workspace role-based UI aware of the registered account. */
      const user = loginRemoteUser({
        email: form.email.trim(),
        name: form.name.trim(),
        platformRole: session.user.platformRole ?? form.role,
        company: form.company.trim(),
      });
      toast(`Welcome, ${user.name.split(" ")[0]}`, {
        description: `Account created — signed in as ${ROLE_LABELS[user.role]}.`,
      });
      router.push("/dashboard");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Registration failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Create your workspace account
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          OEM teams, service partners and field engineers — register to start
          coordinating service tickets.
        </p>
      </div>
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={isEngineer ? "Company / partner (optional)" : "Company / OEM name"}
              required={!isEngineer}
              hint={isEngineer ? "Skip if you're independent" : undefined}
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              error={errors.company}
              placeholder={
                isEngineer ? "e.g. Sunfield Services" : "e.g. Voltrix Energy Pvt Ltd"
              }
            />
            <Select
              label="Join as"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              options={ROLE_OPTIONS}
            />
          </div>

          {isVendor && (
            <div className="space-y-4 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
              <CardHeader
                title="Repair vendor details"
                description="These details appear on your public repair card. Your company is listed as soon as you register."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="City"
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  error={errors.city}
                  placeholder="Jaipur"
                />
                <Input
                  label="State"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="Rajasthan"
                />
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-ink">
                  Inverter types you repair <span className="text-danger-500">*</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {REPAIR_SPECIALITIES.map((s) => {
                    const active = form.specialities.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggle("specialities", s)}
                        aria-pressed={active}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                          active
                            ? "bg-brand-600 text-white"
                            : "border border-line-strong bg-surface text-ink-soft hover:border-brand-300"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                {errors.specialities && (
                  <p className="mt-1 text-xs text-danger-600">{errors.specialities}</p>
                )}
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-ink">Service modes</p>
                <div className="flex flex-wrap gap-2">
                  {REPAIR_SERVICE_MODES.map((m) => {
                    const active = form.serviceModes.includes(m.value);
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => toggle("serviceModes", m.value)}
                        aria-pressed={active}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                          active
                            ? "bg-brand-600 text-white"
                            : "border border-line-strong bg-surface text-ink-soft hover:border-brand-300"
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Input
                label="Typical turnaround"
                value={form.turnaround}
                onChange={(e) => setForm({ ...form, turnaround: e.target.value })}
                placeholder="e.g. 24–48 hrs"
              />
              <FileUpload
                label="Company logo (optional)"
                hint="PNG or JPG — shown on your repair vendor card. A branded initial tile is used if you skip this."
                accept="image/*"
                prompt="Upload company logo"
                onFiles={(names) => setForm((f) => ({ ...f, logoName: names[0] ?? "" }))}
                onFilesData={(files) =>
                  setForm((f) => ({ ...f, logoDataUrl: files[0]?.dataUrl ?? "" }))
                }
              />
              {form.logoDataUrl && (
                <p className="flex items-center gap-2 text-[12px] text-success-700">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {form.logoName || "Logo"} ready
                  — will appear on your card
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Your name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
            />
            <Input
              label="Work email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Phone"
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              error={errors.phone}
              placeholder="+91 98xxx xxxxx"
            />
            <Input
              label="Password"
              type="password"
              required
              hint="Min 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={errors.password}
            />
          </div>
          {serverError && (
            <p className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-center text-[12.5px] text-danger-700">
              {serverError}
            </p>
          )}
          <Button type="submit" size="lg" loading={submitting} className="w-full">
            Create account <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-center text-xs leading-5 text-ink-faint">
            Your account is created in the RAYVIQ database. No verification email is sent in this demo.
          </p>
        </form>
      </Card>
      <p className="mt-4 text-[13px] text-ink-muted">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
