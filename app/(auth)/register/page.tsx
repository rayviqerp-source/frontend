"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Card } from "@/components/ui/card";

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
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    company: "",
    name: "",
    email: "",
    phone: "",
    role: "oem_admin",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEngineer = form.role === "engineer";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!isEngineer && !form.company.trim()) errs.company = "Company name is required";
    if (isEngineer && form.company.length > 0 && !form.company.trim())
      errs.company = "Enter a valid company / partner name or leave it blank";
    if (!form.name.trim()) errs.name = "Full name is required";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.email = "Enter a valid email";
    if (form.phone.replace(/\D/g, "").length < 10) errs.phone = "Enter a valid phone number";
    if (form.password.length < 8) errs.password = "Minimum 8 characters";
    setErrors(errs);
    if (Object.keys(errs).length === 0) setDone(true);
  };

  if (done) {
    return (
      <div>
        <div className="rounded-xl border border-success-100 bg-success-50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success-600" />
          <h1 className="mt-3 text-lg font-semibold text-ink">Check your inbox</h1>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-ink-muted">
            We sent a verification link to <strong className="text-ink">{form.email}</strong>.
            This is a demo — no real email was delivered.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <Button size="lg" onClick={() => router.push("/verify-email")}>
            I have verified — continue
          </Button>
          <Button variant="outline" size="lg" onClick={() => router.push("/login")}>
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

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
          <Button type="submit" size="lg" className="w-full">
            Create account <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-center text-xs leading-5 text-ink-faint">
            Demo registration — no account is actually created and no email is sent.
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
