"use client";

/**
 * Marketplace listing — approved premium UI (dark hero + glass network panel +
 * compact hotel-style expert cards: colour banner with initials, VERIFIED pill,
 * save heart, availability pill, name/city/rating row and jobs/years footer —
 * approved by the project owner).
 * See "Agent coordination" in AGENTS.md: do NOT restyle this page. Only the
 * data logic (state, useMemo filters/sorting) may be edited, keeping JSX and
 * classNames intact.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  Clock,
  Cpu,
  Droplets,
  FileCheck2,
  Heart,
  Layers,
  MapPin,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/constants";
import { inverterArtFor } from "@/lib/inverter-art";
import { EmptyState, LoadingScreen } from "@/components/ui/states";
import { InverterBackdrop } from "@/components/ui/inverter-backdrop";
import { PersonAvatar } from "@/components/marketplace/person-avatar";

const AVATAR_COLORS = ["#2554e0", "#0e7c66", "#b45309", "#7c3aed", "#be123c", "#0369a1", "#a16207"];

function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

type SortKey = "rating" | "jobs" | "response" | "experience";

const PRODUCT_ICONS: Record<string, typeof Zap> = {
  string_inverter: Zap,
  central_inverter: Building2,
  hybrid_inverter: Layers,
  micro_inverter: Cpu,
  pump_inverter: Droplets,
};

const POPULAR_SEARCHES = ["No output", "Wi-Fi setup", "AMC maintenance", "Error code"];

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "OEM-verified engineers" },
  { icon: FileCheck2, label: "Digital service reports" },
  { icon: Clock, label: "SLA-backed dispatch" },
];

const STEPS: { title: string; body: string; icon: typeof Search }[] = [
  {
    title: "Browse & compare",
    body: "Filter by city, product expertise and ratings. Every profile shows certifications and OEM service history.",
    icon: Search,
  },
  {
    title: "Request an expert",
    body: "Share your inverter issue in one tap — the request reaches matching technicians instantly.",
    icon: Send,
  },
  {
    title: "Certified pro assigned",
    body: "A verified engineer contacts you, schedules the visit and submits a digital service report.",
    icon: BadgeCheck,
  },
];

export default function MarketplacePage() {
  const { state, ready } = useStore();
  /* Signed-in clients are never shown the partner / sign-in CTAs. */
  const clientSignedIn = state.portalCustomerIds.length > 0;

  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [cat, setCat] = useState("");
  const [avail, setAvail] = useState("");
  const [verify, setVerify] = useState("");
  const [sort, setSort] = useState<SortKey>("rating");
  const [saved, setSaved] = useState<Set<string>>(new Set());

  /* Active professionals only — suspended / inactive never appear publicly. */
  const active = useMemo(
    () => state.engineers.filter((e) => e.status !== "suspended" && e.status !== "inactive"),
    [state.engineers],
  );

  const cities = useMemo(() => [...new Set(active.map((e) => e.city).filter(Boolean))].sort(), [active]);

  const categories = useMemo(() => {
    const keys = new Set(active.flatMap((e) => e.productExpertise));
    return [...keys].sort();
  }, [active]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const out = active.filter((e) => {
      if (city && e.city !== city) return false;
      if (cat && !e.productExpertise.includes(cat)) return false;
      if (avail && e.availability !== avail) return false;
      if (verify === "approved" && e.verification !== "approved") return false;
      if (verify === "in_review" && !["submitted", "under_verification", "more_info_required"].includes(e.verification))
        return false;
      if (!query) return true;
      return (
        e.name.toLowerCase().includes(query) ||
        e.city.toLowerCase().includes(query) ||
        e.state.toLowerCase().includes(query) ||
        e.skills.some((s) => s.toLowerCase().includes(query)) ||
        e.productExpertise.some((c) => (PRODUCT_CATEGORY_LABELS[c] ?? c).toLowerCase().includes(query))
      );
    });
    return out.sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating || b.completedJobs - a.completedJobs;
      if (sort === "jobs") return b.completedJobs - a.completedJobs;
      if (sort === "response") return a.avgResponseMins - b.avgResponseMins;
      return b.experienceYears - a.experienceYears;
    });
  }, [active, q, city, cat, avail, verify, sort]);

  const verifiedCount = active.filter((e) => e.verification === "approved").length;
  const totalJobs = active.reduce((s, e) => s + e.completedJobs, 0);
  const rated = active.filter((e) => e.rating > 0);
  const avgRating = rated.length ? rated.reduce((s, e) => s + e.rating, 0) / rated.length : 0;

  const filtersActive = Boolean(q || city || cat || avail || verify);

  if (!ready) return <LoadingScreen label="Loading the marketplace…" />;

  return (
    <div className="flex flex-col gap-6">
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden bg-ink order-2 sm:order-1">
        {/* glows + grid */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl" />
          <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-brand-800/50 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage: "radial-gradient(ellipse 80% 70% at 50% 0%, black 40%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 0%, black 40%, transparent 100%)",
            }}
          />
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl gap-6 px-4 pb-10 pt-10 sm:px-6 sm:pb-16 sm:pt-20 lg:grid-cols-[1.05fr_360px] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-medium text-white/90 ring-1 ring-white/20 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-brand-300" aria-hidden />
              Verified solar service professionals
            </span>

            <h1 className="mt-3 max-w-2xl text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl">
              Solar inverter repair experts,{" "}
              <span className="bg-gradient-to-r from-brand-200 via-white to-brand-300 bg-clip-text text-transparent">
                at your doorstep
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-[15px] leading-7 text-white/70">
              Browse certified technicians from RAYVIQ-verified service partners — real ratings, live availability
              and OEM-grade service history on every profile.
            </p>

            {/* Search */}
            <div className="mt-6 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-2 shadow-2xl shadow-black/40 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-brand-400">
              <Search className="ml-2.5 h-4.5 w-4.5 shrink-0 text-ink-faint" aria-hidden />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by skill, city or expert name…"
                aria-label="Search technicians"
                className="h-11 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
              <a
                href="#experts"
                className="hidden h-11 shrink-0 items-center rounded-xl bg-brand-600 px-5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-500 sm:flex"
              >
                Search
              </a>
            </div>

            {/* Popular searches */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-white/50">Popular:</span>
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setQ(term);
                    document.getElementById("experts")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="rounded-full px-2.5 py-1 text-[12px] font-medium text-white/70 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Live network panel */}
          <div className="rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/15 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Live network</p>
            <dl className="mt-4 space-y-1">
              {[
                { icon: Users, label: "Experts on network", value: `${active.length}` },
                { icon: BadgeCheck, label: "OEM-verified", value: `${verifiedCount}` },
                { icon: MapPin, label: "Cities covered", value: `${cities.length}` },
                { icon: Wrench, label: "Jobs completed", value: `${totalJobs}` },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
                >
                  <dt className="flex items-center gap-2.5 text-[13px] text-white/70">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-brand-200">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    {label}
                  </dt>
                  <dd className="text-lg font-semibold tracking-tight text-white">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-semibold tracking-tight text-white">{avgRating.toFixed(1)}</p>
                  <div className="mt-1 flex gap-0.5" aria-hidden>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < Math.round(avgRating) ? "fill-warning-400 text-warning-400" : "text-white/25"}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="max-w-[140px] text-right text-[11px] leading-4 text-white/55">
                  average rating across the verified network
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* trust strip */}
        <div className="relative border-t border-white/10">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3.5 sm:px-6">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-2 text-[12px] font-medium text-white/60">
                <Icon className="h-3.5 w-3.5 text-brand-300" aria-hidden />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how-it-works" className="order-3 sm:order-3 scroll-mt-16 border-b border-line bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">How it works</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              From fault to fixed — in three steps
            </h2>
          </div>
          <ol
            className="mt-6 flex flex-row gap-3 overflow-x-auto pb-2 no-scrollbar sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0"
          >
            {STEPS.map(({ title, body, icon: Icon }, i) => (
              <li
                key={title}
                className="relative min-w-[190px] rounded-xl border border-line bg-canvas p-3 sm:p-4"
              >
                <span className="absolute right-3 top-3 text-3xl font-bold leading-none text-brand-100" aria-hidden>
                  {i + 1}
                </span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="mt-2 text-[13px] font-semibold text-ink">{title}</p>
                <p className="mt-1 text-[11px] leading-4 text-ink-muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- Experts ---------------- */}
      <section id="experts" className="order-1 sm:order-2 bg-canvas scroll-mt-16">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">The network</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl">Available experts</h2>
              <p className="mt-1 text-[13px] text-ink-muted">
                {rows.length} professional{rows.length === 1 ? "" : "s"} matching your filters
              </p>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort experts"
              className="h-10 rounded-xl border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink shadow-card"
            >
              <option value="rating">Top rated</option>
              <option value="jobs">Most jobs done</option>
              <option value="response">Fastest response</option>
              <option value="experience">Most experienced</option>
            </select>
          </div>

          {/* Product chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[12px] font-medium text-ink-muted">Browse by product:</span>
            <button
              type="button"
              onClick={() => setCat("")}
              aria-pressed={!cat}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-all ${
                !cat
                  ? "bg-brand-600 text-white shadow-card"
                  : "border border-line-strong bg-surface text-ink-soft hover:border-brand-300 hover:text-ink"
              }`}
            >
              All types
            </button>
            {categories.map((c) => {
              const Icon = PRODUCT_ICONS[c] ?? Zap;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(cat === c ? "" : c)}
                  aria-pressed={cat === c}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-all ${
                    cat === c
                      ? "bg-brand-600 text-white shadow-card"
                      : "border border-line-strong bg-surface text-ink-soft hover:border-brand-300 hover:text-ink"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {PRODUCT_CATEGORY_LABELS[c] ?? c}
                </button>
              );
            })}          </div>

          {/* Remaining filters */}
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label="Filter by city"
              className="h-9 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] text-ink"
            >
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={avail}
              onChange={(e) => setAvail(e.target.value)}
              aria-label="Filter by availability"
              className="h-9 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] text-ink"
            >
              <option value="">Any availability</option>
              <option value="available">Available now</option>
              <option value="busy">On a job</option>
              <option value="offline">Offline</option>
            </select>
            <select
              value={verify}
              onChange={(e) => setVerify(e.target.value)}
              aria-label="Filter by verification"
              className="h-9 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] text-ink"
            >
              <option value="">All profiles</option>
              <option value="approved">Verified only</option>
              <option value="in_review">In verification</option>
            </select>
            {filtersActive && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setCity("");
                  setCat("");
                  setAvail("");
                  setVerify("");
                }}
                className="h-9 rounded-lg px-3 text-[13px] font-medium text-brand-700 transition-colors hover:bg-brand-50"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Cards */}
          {rows.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-line-strong bg-surface p-8">
              <EmptyState
                icon={<Wrench className="h-5 w-5" />}
                title="No experts match those filters"
                description="Try a different city or clear the filters to see the full network."
              />
            </div>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {rows.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/marketplace/${e.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-pop"
                  >
                    {/* photo banner */}
                    <div
                      className="relative h-28 shrink-0 overflow-hidden"
                      style={{ backgroundColor: avatarColor(e.name) }}
                    >
                      <InverterBackdrop src={inverterArtFor(e)} />
                      <span className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/25" aria-hidden />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <PersonAvatar
                          id={e.id}
                          name={e.name}
                          backgroundColor={avatarColor(e.name)}
                          className="h-16 w-16 rounded-2xl text-lg ring-2 ring-white/80 shadow-pop transition-transform duration-200 group-hover:scale-105 sm:h-20 sm:w-20 sm:text-xl"
                        />
                      </span>
                      <span
                        className={`absolute left-2.5 top-2.5 rounded-md px-2 py-1 text-[9.5px] font-bold uppercase tracking-widest shadow-card sm:left-3 sm:top-3 ${
                          e.verification === "approved" ? "bg-white/95 text-ink" : "bg-warning-50/95 text-warning-700"
                        }`}
                      >
                        {e.verification === "approved" ? "Verified" : "In review"}
                      </span>
                      <button
                        type="button"
                        aria-pressed={saved.has(e.id)}
                        aria-label={saved.has(e.id) ? `Remove ${e.name} from saved` : `Save ${e.name}`}
                        onClick={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          setSaved((prev) => {
                            const next = new Set(prev);
                            if (next.has(e.id)) next.delete(e.id);
                            else next.add(e.id);
                            return next;
                          });
                        }}
                        className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-card transition-transform hover:scale-105 active:scale-95 sm:right-3 sm:top-3"
                      >
                        <Heart
                          className={`h-4 w-4 ${saved.has(e.id) ? "fill-rose-500 text-rose-500" : "text-ink-faint"}`}
                          aria-hidden
                        />
                      </button>
                      <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur sm:bottom-3 sm:left-3">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            e.availability === "available"
                              ? "bg-success-400"
                              : e.availability === "busy"
                                ? "bg-warning-400"
                                : "bg-white/50"
                          }`}
                          aria-hidden
                        />
                        {e.availability === "available" ? "Available" : e.availability === "busy" ? "On a job" : "Offline"}
                      </span>
                    </div>

                    {/* body */}
                    <div className="flex flex-1 flex-col p-3 sm:p-4">
                      <p className="truncate text-[14px] font-semibold tracking-tight text-ink sm:text-[15px]">{e.name}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-2 text-[12.5px]">
                        <span className="flex min-w-0 items-center gap-1 text-ink-muted">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
                          <span className="truncate">{e.city}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 font-semibold text-ink">
                          {e.rating > 0 ? e.rating.toFixed(1) : "New"}
                          <Star className="h-3.5 w-3.5 fill-warning-400 text-warning-400" aria-hidden />
                        </span>
                      </div>
                      <div className="mt-auto">
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5 text-[12.5px]">
                          <span className="font-bold text-ink">{e.completedJobs} jobs</span>
                          <span className="text-ink-faint">/ {e.experienceYears} yrs</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ---------------- Vendor CTA (hidden for signed-in clients) ---------------- */}
      {!clientSignedIn && (
        <section className="relative overflow-hidden bg-gradient-to-br from-ink via-brand-900 to-brand-800 text-white">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" />
            <div className="absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-brand-400/20 blur-3xl" />
          </div>
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-5 px-4 py-12 sm:flex-row sm:items-center sm:px-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">For service businesses</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Run a solar service company?</h2>
              <p className="mt-2 max-w-lg text-[13px] leading-6 text-white/70">
                Join the RAYVIQ service network — onboard your technicians, get verified once, and receive dispatch
                offers from leading inverter OEMs.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-[13px] font-semibold text-ink shadow-pop transition-colors hover:bg-brand-50"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Sign in as a partner
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
