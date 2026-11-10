"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  UserRound,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { initials, relativeTime } from "@/lib/utils";

/**
 * Client "My Profile" — the customer-facing account screen (premium compact).
 * Dark identity hero with glass stats, inline Edit-profile mode, then tight
 * sections for actions, recent requests and sites. Only end customers /
 * dealers reach this page; OEM and partner staff have their own workspace
 * profiles (/oem/profile, /vendor/profile).
 */
export default function ClientProfilePage() {
  const { state, portalLogout, updateCustomer, toast } = useStore();
  const [revealPhone, setRevealPhone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    city: "",
    pincode: "",
  });

  const customer = state.customers.find((c) => state.portalCustomerIds.includes(c.id)) ?? null;

  if (!customer) {
    return (
      <Card className="p-5">
        <EmptyState
          icon={<UserRound className="h-5 w-5" />}
          title="You're not signed in"
          description="Sign in with your mobile number to see your bookings, sites and AMC coverage."
          action={
            <Link href="/client/login">
              <Button>Sign in to client app</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const sites = state.sites.filter((s) => s.customerId === customer.id);
  const siteIds = new Set(sites.map((s) => s.id));
  const tickets = state.tickets.filter(
    (t) => t.customerId === customer.id || siteIds.has(t.siteId),
  );
  const contracts = state.amcContracts.filter((c) => c.customerId === customer.id);
  const open = tickets.filter((t) => t.status !== "closed" && t.status !== "completed");
  const recent = [...tickets]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 5);

  const startEdit = () => {
    setForm({
      name: customer.name,
      company: customer.company ?? "",
      phone: customer.phone,
      email: customer.email ?? "",
      city: customer.city,
      pincode: customer.pincode,
    });
    setEditing(true);
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    updateCustomer(customer.id, {
      name: form.name.trim() || customer.name,
      phone: form.phone.trim() || customer.phone,
      email: form.email.trim() || undefined,
      company: form.company.trim() || undefined,
      city: form.city.trim() || customer.city,
      pincode: form.pincode.trim() || customer.pincode,
    });
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* ---------- Premium identity hero ---------- */}
      <section className="relative overflow-hidden rounded-3xl bg-ink p-5 text-white shadow-pop">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-600/40 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-brand-400/20 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.3]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "36px 36px",
              maskImage: "radial-gradient(ellipse 80% 80% at 30% 0%, black 30%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 30% 0%, black 30%, transparent 100%)",
            }}
          />
        </div>

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3.5">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-lg font-bold text-white ring-2 ring-white/25"
                aria-hidden
              >
                {initials(customer.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold tracking-tight text-white">{customer.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/85 ring-1 ring-white/20">
                    {customer.type.replace(/_/g, " ")}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-white/65">
                    <MapPin className="h-3 w-3" aria-hidden />
                    {customer.city}, {customer.state}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => (editing ? setEditing(false) : startEdit())}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[12px] font-semibold text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-white/20"
            >
              {editing ? (
                <>
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Close
                </>
              ) : (
                <>
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Edit
                </>
              )}
            </button>
          </div>

          {customer.company && (
            <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-white/70">
              <Building2 className="h-3.5 w-3.5 text-white/45" aria-hidden />
              {customer.company} · <span className="text-white/50">{customer.pincode}</span>
            </p>
          )}

          {/* glass mini stats */}
          <div className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-white/[0.07] p-2 ring-1 ring-white/15 backdrop-blur-sm">
            {[
              { label: "Tickets", value: tickets.length },
              { label: "Open", value: open.length },
              { label: "Sites", value: sites.length },
              { label: "AMC", value: contracts.length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl px-1 py-1.5 text-center transition-colors hover:bg-white/5">
                <p className="text-base font-bold tracking-tight text-white">{value}</p>
                <p className="mt-0.5 text-[9.5px] font-medium uppercase tracking-wide text-white/55">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Edit mode / contact ---------- */}
      {editing ? (
        <Card className="p-4">
          <CardHeader
            title="Edit profile"
            description="Update your account details — changes save to your demo account instantly."
          />
          <form onSubmit={save} className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input
              label="Full name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Company (optional)"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
            <Input
              label="Mobile number"
              required
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label="Email (optional)"
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="City"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
            <Input
              label="Pincode"
              inputMode="numeric"
              value={form.pincode}
              onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
            />
            <div className="flex items-center gap-2 sm:col-span-2">
              <Button type="submit" size="sm">
                <Save className="h-3.5 w-3.5" aria-hidden />
                Save changes
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-alt px-3.5 py-2.5">
              <span className="flex min-w-0 items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wide text-ink-faint">Mobile</span>
                  <span className="block truncate text-[13px] font-medium text-ink">
                    {revealPhone ? customer.phone : customer.phone.replace(/\d{5}$/, "•••••")}
                  </span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => setRevealPhone((v) => !v)}
                className="shrink-0 text-[11px] font-medium text-brand-600 hover:underline"
              >
                {revealPhone ? "hide" : "reveal"}
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-alt px-3.5 py-2.5">
              <Mail className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
              <span className="min-w-0">
                <span className="block text-[10px] uppercase tracking-wide text-ink-faint">Email</span>
                <span className="block truncate text-[13px] font-medium text-ink">{customer.email ?? "—"}</span>
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* ---------- Quick actions ---------- */}
      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href="/marketplace"
          className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-card transition-colors hover:border-brand-300"
        >
          <span>
            <span className="block text-[13px] font-semibold text-ink">Book an engineer</span>
            <span className="mt-0.5 block text-[12px] text-ink-muted">Verified experts near you</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
        <Link
          href="/client/bookings"
          className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-card transition-colors hover:border-brand-300"
        >
          <span>
            <span className="block text-[13px] font-semibold text-ink">My bookings</span>
            <span className="mt-0.5 block text-[12px] text-ink-muted">Track visits and reports</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>

      {/* ---------- Recent requests ---------- */}
      {recent.length > 0 && (
        <Card padded={false}>
          <div className="px-4 pt-4">
            <CardHeader
              title="Recent service requests"
              description="Your latest bookings and where they stand."
              action={
                <Link href="/client/bookings" className="text-[12px] font-medium text-brand-700 hover:text-brand-800">
                  View all →
                </Link>
              }
            />
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {recent.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <span className="font-mono text-[12px] font-medium text-ink">{t.ref}</span>
                <span className="text-[13px] text-ink-soft">{t.issue.category}</span>
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-[11px] text-ink-faint">{relativeTime(t.updatedAt)}</span>
                  <StatusBadge status={t.status} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ---------- Sites ---------- */}
      {sites.length > 0 && (
        <Card className="p-4">
          <CardHeader title="My sites" description="Installations linked to your account." />
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((s) => (
              <li key={s.id} className="rounded-xl border border-line bg-surface-alt/50 px-3.5 py-2.5">
                <p className="text-[13px] font-medium text-ink">{s.name}</p>
                <p className="mt-0.5 text-[12px] text-ink-muted">
                  {s.city} · {s.capacityKw} kW · {s.siteType.replace(/_/g, " ")}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ---------- Sign out ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            portalLogout();
            toast("Signed out", { tone: "info" });
          }}
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
        </Button>
        <p className="text-[11px] text-ink-faint">
          Need the OEM or partner workspace?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Sign in as a partner
          </Link>
        </p>
      </div>
    </div>
  );
}
