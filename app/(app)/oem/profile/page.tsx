"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  Globe,
  Mail,
  MapPin,
  Package,
  Phone,
  Users,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate, initials } from "@/lib/utils";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

/**
 * OEM partner "Company profile" — reached from the bottom nav "Profile" tab
 * for oem_admin / oem_service_manager / oem_service_executive.
 *
 * Distinct from the CLIENT (customer) account at /client/profile — the
 * "My Profile" label is reserved for the client app — and from the vendor
 * profile at /vendor/profile. Role-specific actions sit at the top
 * (PageHeader actions) and the bottom (quick actions card).
 */

const OEM_ROLES = ["oem_admin", "oem_service_manager", "oem_service_executive"];

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "gray"> = {
  active: "green",
  onboarding: "amber",
  suspended: "red",
};

const SUB_TONE: Record<string, "green" | "amber" | "red" | "gray"> = {
  active: "green",
  trial: "amber",
  past_due: "red",
  cancelled: "gray",
};

const TOP_ACTIONS = [
  { href: "/oem/products", icon: Package, label: "View products" },
  { href: "/oem/engineers", icon: Wrench, label: "Service engineers" },
];

const BOTTOM_ACTIONS = [
  {
    href: "/oem/reports",
    icon: ClipboardList,
    label: "Service reports",
    description: "Review and sign off field service reports.",
  },
  {
    href: "/oem/analytics",
    icon: BarChart3,
    label: "Analytics",
    description: "Network performance and SLA trends.",
  },
  {
    href: "/oem/customers",
    icon: Users,
    label: "Customers",
    description: "End customers under your service network.",
  },
  {
    href: "/oem/sites",
    icon: MapPin,
    label: "Sites",
    description: "Installations mapped across service regions.",
  },
];

export default function OemProfilePage() {
  const { state, currentUser, effectiveRole } = useStore();

  if (!currentUser) return null;

  const oem = state.oems.find((o) => o.id === currentUser.oemId) ?? state.oems[0];

  if (!OEM_ROLES.includes(effectiveRole) || !oem) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="p-5">
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="OEM workspace only"
            description="This company profile belongs to OEM partner accounts. Sign in with an OEM role, or open your own profile from the sidebar."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Company profile"
        description={`${oem.name} — OEM partner account on the RAYVIQ network.`}
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
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-white"
            style={{ backgroundColor: oem.logoColor }}
            aria-hidden
          >
            {oem.shortName}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-ink">
              {oem.name}
              <Badge tone={STATUS_TONE[oem.status] ?? "gray"} dot>
                {oem.status}
              </Badge>
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                {oem.industry}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                {oem.hqCity}, {oem.hqState}
              </span>
              {oem.website && (
                <span className="inline-flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                  {oem.website}
                </span>
              )}
            </p>
          </div>
          <Badge tone={SUB_TONE[oem.subscriptionStatus] ?? "gray"}>
            Subscription · {oem.subscriptionStatus.replace(/_/g, " ")}
          </Badge>
        </div>
      </Card>

      {/* Plan stats */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Plan seats" value={oem.seats} icon={<Users className="h-4 w-4" />} tone="brand" />
        <StatCard
          label="Service regions"
          value={oem.serviceRegions.length}
          icon={<MapPin className="h-4 w-4" />}
        />
        <StatCard
          label="Product categories"
          value={oem.productCategories.length}
          icon={<Package className="h-4 w-4" />}
        />
        <StatCard
          label="Go-live date"
          value={formatDate(oem.goLiveDate)}
          icon={<CalendarDays className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Coverage */}
        <Card className="p-5">
          <CardHeader
            title="Service coverage"
            description="Regions and inverter categories this OEM supports on the network."
          />
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Regions</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {oem.serviceRegions.map((r) => (
              <span key={r} className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700">
                {r}
              </span>
            ))}
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Product categories</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {oem.productCategories.map((c) => (
              <span key={c} className="rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-medium text-ink-soft">
                {c.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </Card>

        {/* Signed-in account admin */}
        <Card className="p-5">
          <CardHeader
            title="Your account"
            description="Your sign-in details for this OEM workspace."
          />
          <div className="mt-3 flex items-center gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: currentUser.avatarColor }}
              aria-hidden
            >
              {initials(currentUser.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ink">{currentUser.name}</p>
              <p className="text-[12px] text-ink-muted">
                {currentUser.designation ?? ROLE_LABELS[effectiveRole]} · {ROLE_LABELS[effectiveRole]}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2 border-t border-line pt-3 text-[13px]">
            <p className="flex items-center gap-2 text-ink-soft">
              <Mail className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
              {currentUser.email}
            </p>
            {currentUser.phone && (
              <p className="flex items-center gap-2 text-ink-soft">
                <Phone className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                {currentUser.phone}
              </p>
            )}
            <p className="flex items-center gap-2 text-ink-soft">
              <Activity className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
              Primary contact · {oem.contactName}
            </p>
          </div>
        </Card>
      </div>

      {/* Bottom quick actions */}
      <Card className="mt-4 p-5">
        <CardHeader
          title="Workspace quick actions"
          description="Jump straight into the OEM tools — buttons specific to the partner account."
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
