"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardList,
  Mail,
  MapPin,
  Phone,
  Star,
  TicketIcon,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { usePartnerScope } from "@/components/vendor/scope";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate, initials } from "@/lib/utils";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

/**
 * Vendor (service company) "Company profile" — reached from the bottom nav
 * "Profile" tab for partner_manager. Engineers use /engineer/profile and the
 * client (customer) account lives at /client/profile — every role has its own
 * page, with role-specific actions at the top (PageHeader actions) and the
 * bottom (quick actions card).
 */

const TOP_ACTIONS = [
  { href: "/vendor/engineers", icon: Users, label: "My engineers" },
  { href: "/vendor/onboarding", icon: UserPlus, label: "Onboarding" },
];

const BOTTOM_ACTIONS = [
  {
    href: "/vendor/assignments",
    icon: ClipboardList,
    label: "Assignments",
    description: "Distribute jobs across your technicians.",
  },
  {
    href: "/engineer/requests",
    icon: TicketIcon,
    label: "Live requests",
    description: "Dispatch offers waiting for acceptance.",
  },
  {
    href: "/vendor/onboarding",
    icon: UserPlus,
    label: "Add technicians",
    description: "Onboard and verify new engineers.",
  },
];

export default function VendorProfilePage() {
  const { currentUser } = useStore();
  const { partner, engineers } = usePartnerScope();

  if (!currentUser) return null;

  if (!partner) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="p-5">
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="No service company linked"
            description="Your account is not linked to a service partner yet. Ask the RAYVIQ network desk to attach your account to a company."
          />
        </Card>
      </div>
    );
  }

  const verified = engineers.filter((e) => e.verification === "approved").length;
  const available = engineers.filter((e) => e.availability === "available").length;
  const totalJobs = engineers.reduce((s, e) => s + e.completedJobs, 0);
  const teamPreview = [...engineers]
    .sort((a, b) => b.rating - a.rating || b.completedJobs - a.completedJobs)
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Company profile"
        description={`${partner.name} — service company account on the RAYVIQ network.`}
        actions={
          <div className="flex flex-wrap gap-2">
            {TOP_ACTIONS.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}>
                <Button variant="outline" size="sm">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </Button>
              </Link>
            ))}
          </div>
        }
      />

      {/* Company identity */}
      <Card className="mb-4 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white"
            aria-hidden
          >
            {initials(partner.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-ink">
              {partner.name}
              <Badge tone={partner.status === "active" ? "green" : "gray"} dot>
                {partner.status}
              </Badge>
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                {partner.city}, {partner.state}
              </span>
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-warning-400 text-warning-400" aria-hidden />
                {partner.rating > 0 ? `${partner.rating.toFixed(1)} partner rating` : "New partner"}
              </span>
              <span className="inline-flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                On network since {formatDate(partner.since)}
              </span>
            </p>
          </div>
        </div>
      </Card>

      {/* Team stats */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Technicians" value={engineers.length} icon={<Users className="h-4 w-4" />} tone="brand" />
        <StatCard
          label="OEM verified"
          value={verified}
          icon={<BadgeCheck className="h-4 w-4" />}
          tone="success"
        />
        <StatCard label="Available now" value={available} icon={<Wrench className="h-4 w-4" />} />
        <StatCard label="Jobs completed" value={totalJobs} icon={<ClipboardList className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top technicians */}
        <Card className="p-5">
          <CardHeader
            title="Top technicians"
            description="Your highest-rated engineers right now."
            action={
              <Link href="/vendor/engineers" className="text-[12px] font-medium text-brand-600 hover:text-brand-700">
                View all
              </Link>
            }
          />
          {teamPreview.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                icon={<Users className="h-5 w-5" />}
                title="No technicians yet"
                description="Onboard your first engineer to start receiving dispatch offers."
              />
            </div>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {teamPreview.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-3 py-2.5"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ backgroundColor: e.id.endsWith("9") ? "#0e7c66" : "#2554e0" }}
                      aria-hidden
                    >
                      {initials(e.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-ink">{e.name}</span>
                      <span className="block text-[11px] text-ink-muted">
                        {e.city} · {e.experienceYears} yrs
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-[12px] font-semibold text-ink">
                    <Star className="h-3 w-3 fill-warning-400 text-warning-400" aria-hidden />
                    {e.rating > 0 ? e.rating.toFixed(1) : "New"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Signed-in account */}
        <Card className="p-5">
          <CardHeader
            title="Your account"
            description="Your sign-in details for this company workspace."
          />
          <div className="mt-3 flex items-center gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white"
              aria-hidden
            >
              {initials(currentUser.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ink">{currentUser.name}</p>
              <p className="text-[12px] text-ink-muted">
                {currentUser.designation ?? ROLE_LABELS.partner_manager} · {ROLE_LABELS.partner_manager}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2 border-t border-line pt-3 text-[13px]">
            <p className="flex items-center gap-2 text-ink-soft">
              <Mail className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
              {currentUser.email}
            </p>
            <p className="flex items-center gap-2 text-ink-soft">
              <Phone className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
              {partner.phone}
            </p>
            <p className="flex items-center gap-2 text-ink-soft">
              <Building2 className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
              Company contact · {partner.contactName}
            </p>
          </div>
        </Card>
      </div>

      {/* Bottom quick actions */}
      <Card className="mt-4 p-5">
        <CardHeader
          title="Workspace quick actions"
          description="Company-specific tools for the vendor workspace."
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {BOTTOM_ACTIONS.map(({ href, icon: Icon, label, description }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-4 py-3 transition-colors hover:border-brand-300 hover:bg-brand-50/50"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-ink">{label}</span>
                  <span className="block truncate text-[12px] text-ink-muted">{description}</span>
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
