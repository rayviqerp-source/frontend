"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Clock,
  MapPin,
  Star,
  UserRound,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/constants";
import { inverterArtFor } from "@/lib/inverter-art";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { InverterBackdrop } from "@/components/ui/inverter-backdrop";
import { PersonPhoto } from "@/components/ui/person-photo";

const AVATAR_COLORS = ["#2554e0", "#0e7c66", "#b45309", "#7c3aed", "#be123c", "#0369a1", "#a16207"];

function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

/**
 * Client app home — the customer's landing screen.
 * Shows the recommended engineers (two per row, with photos) and any
 * booking that is currently in progress.
 */
export default function ClientHomePage() {
  const { state } = useStore();

  const customer = state.customers.find((c) => state.portalCustomerIds.includes(c.id)) ?? null;

  const engineers = useMemo(
    () =>
      state.engineers
        .filter((e) => e.status === "active" && e.verification === "approved")
        .sort((a, b) => b.rating - a.rating || b.completedJobs - a.completedJobs),
    [state.engineers],
  );

  const sites = customer ? state.sites.filter((s) => s.customerId === customer.id) : [];
  const siteIds = new Set(sites.map((s) => s.id));
  const tickets = customer
    ? state.tickets
        .filter((t) => t.customerId === customer.id || siteIds.has(t.siteId))
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    : [];
  const active = tickets.filter((t) => t.status !== "closed" && t.status !== "completed").slice(0, 3);

  if (!customer) {
    return (
      <Card className="p-5">
        <EmptyState
          icon={<UserRound className="h-5 w-5" />}
          title="Welcome to the RAYVIQ client app"
          description="Sign in with your mobile number to book an engineer and track your repairs."
          action={
            <Link href="/client/login">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Hi {customer.name.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          {active.length > 0
            ? `You have ${active.length} service request${active.length === 1 ? "" : "s"} in progress.`
            : "Book a verified solar inverter expert whenever you need one."}
        </p>
      </div>

      {/* Primary action */}
      <Link
        href="/marketplace"
        className="group flex items-center justify-between gap-3 rounded-2xl bg-brand-600 p-4 text-white shadow-pop transition-colors hover:bg-brand-700"
      >
        <span>
          <span className="block text-[15px] font-semibold">Book an engineer</span>
          <span className="mt-0.5 block text-[12px] text-white/75">
            Verified experts near {customer.city} — average response under 25 minutes
          </span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>

      {/* Active bookings */}
      {active.length > 0 && (
        <Card padded={false}>
          <div className="px-4 pt-4 sm:px-5 sm:pt-5">
            <CardHeader
              title="In progress"
              description="Live status of your current service requests."
              action={
                <Link href="/client/bookings" className="text-[13px] font-medium text-brand-700 hover:text-brand-800">
                  All bookings →
                </Link>
              }
            />
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {active.map((t) => {
              const site = state.sites.find((s) => s.id === t.siteId);
              const engineer = state.engineers.find((e) => e.id === t.assignedEngineerId);
              const visit = state.visits.find((v) => v.ticketId === t.id);
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-5">
                  <span className="font-mono text-[12px] font-medium text-ink">{t.ref}</span>
                  <span className="text-[13px] text-ink-soft">{t.issue.category}</span>
                  <span className="text-[12px] text-ink-faint">
                    {engineer?.name ?? "Assigning engineer…"}
                    {site ? ` · ${site.name}` : ""}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    {visit && (
                      <span className="hidden items-center gap-1 text-[11px] text-ink-faint sm:inline-flex">
                        <CalendarClock className="h-3 w-3" aria-hidden />
                        {visit.slot}
                      </span>
                    )}
                    <StatusBadge status={t.status} />
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Recommended engineers — responsive grid (2 on mobile, 4 on desktop) */}
      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">Top engineers for you</h2>
            <p className="mt-0.5 text-[12px] text-ink-muted">
              Highest rated verified professionals on the RAYVIQ network
            </p>
          </div>
          <Link href="/marketplace" className="text-[13px] font-medium text-brand-700 hover:text-brand-800">
            See all →
          </Link>
        </div>

        <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {engineers.slice(0, 8).map((e) => (
            <li key={e.id}>
              <Link
                href={`/marketplace/${e.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-pop"
              >
                <div
                  className="relative h-24 shrink-0 overflow-hidden"
                  style={{ backgroundColor: avatarColor(e.name) }}
                >
                  <InverterBackdrop src={inverterArtFor(e)} />
                  <span className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/25" aria-hidden />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <PersonPhoto
                      id={e.id}
                      name={e.name}
                      className="h-14 w-14 rounded-2xl text-base ring-2 ring-white/80 shadow-pop transition-transform duration-200 group-hover:scale-105"
                      backgroundColor={avatarColor(e.name)}
                    />
                  </span>
                  <span className="absolute left-2 top-2 rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-ink shadow-card">
                    Verified
                  </span>
                  <span
                    className={`absolute bottom-2 left-2 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide shadow-card ${
                      e.availability === "available"
                        ? "bg-success-500 text-white"
                        : e.availability === "busy"
                          ? "bg-warning-500 text-white"
                          : "bg-white/90 text-ink-muted"
                    }`}
                  >
                    {e.availability === "available" ? "Available" : e.availability === "busy" ? "On a job" : "Offline"}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-3">
                  <p className="flex items-center gap-1 truncate text-[13.5px] font-semibold tracking-tight text-ink">
                    {e.name}
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-success-600" aria-label="Verified" />
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] text-ink-muted">
                    <MapPin className="h-3 w-3 shrink-0 text-ink-faint" aria-hidden />
                    {e.city} · {e.experienceYears} yrs
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.productExpertise.slice(0, 1).map((c) => (
                      <span
                        key={c}
                        className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-muted"
                      >
                        {PRODUCT_CATEGORY_LABELS[c] ?? c}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-2.5 text-[11.5px]">
                    <span className="inline-flex items-center gap-1 font-medium text-ink">
                      <Star className="h-3 w-3 fill-warning-400 text-warning-400" aria-hidden />
                      {e.rating.toFixed(1)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-ink-faint">
                      <Clock className="h-3 w-3" aria-hidden />~{e.avgResponseMins}m
                    </span>
                  </div>

                  <span className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-brand-50 text-[12px] font-semibold text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                    <Wrench className="h-3.5 w-3.5" aria-hidden />
                    Book now
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {engineers.length === 0 && (
          <Card className="mt-3 p-4">
            <EmptyState
              icon={<Wrench className="h-5 w-5" />}
              title="No engineers listed yet"
              description="The network is being verified — check back shortly."
            />
          </Card>
        )}
      </div>

      {/* AMC banner */}
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-ink">Covered under AMC?</p>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            Preventive maintenance visits and priority response for contracted sites.
          </p>
        </div>
        <Badge tone="green">{sites.filter((s) => s.amcId).length} of {sites.length} sites covered</Badge>
      </Card>
    </div>
  );
}
