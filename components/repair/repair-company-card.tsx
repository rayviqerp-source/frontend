"use client";

import Image from "next/image";
import { Building2, Check, MapPin, Star, Wrench } from "lucide-react";
import type { ServicePartner } from "@/lib/types";
import { inverterArtForPartner } from "@/lib/inverter-art";
import { InverterBackdrop } from "@/components/ui/inverter-backdrop";
import { cn } from "@/lib/utils";

const BANNER_COLORS = ["#2554e0", "#0e7c66", "#b45309", "#7c3aed", "#be123c", "#0369a1", "#a16207"];

function bannerColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h + ch.charCodeAt(0)) % BANNER_COLORS.length;
  return BANNER_COLORS[h];
}

/**
 * Premium repair-company card — mirrors the Marketplace engineer cards:
 * a coloured inverter-art banner with the vendor logo tile, a "REPAIR VENDOR"
 * pill, a turnaround badge and a compact name / city / rating / jobs body.
 */
export function RepairCompanyCard({
  partner,
  selected,
  onSelect,
}: {
  partner: ServicePartner;
  selected: boolean;
  onSelect: () => void;
}) {
  const logo = partner.image ?? partner.logoUrl;
  const specialities = partner.repairSpecialities ?? [];
  const color = bannerColor(partner.name);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-surface text-left shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-pop",
        selected
          ? "border-brand-400 ring-2 ring-brand-100"
          : "border-line hover:border-brand-300",
      )}
    >
      {/* banner */}
      <div className="relative h-24 shrink-0 overflow-hidden sm:h-28" style={{ backgroundColor: color }}>
        <InverterBackdrop src={inverterArtForPartner(specialities)} />
        <span className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/25" aria-hidden />

        {/* logo tile */}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-pop ring-2 ring-white/80 transition-transform duration-200 group-hover:scale-105 sm:h-16 sm:w-16">
            {logo ? (
              <Image
                src={logo}
                alt={`${partner.name} logo`}
                width={56}
                height={56}
                className="h-full w-full object-contain p-1"
                unoptimized={logo.startsWith("data:")}
              />
            ) : (
              <Building2 className="h-7 w-7 text-ink-faint" aria-hidden />
            )}
          </span>
        </span>

        <span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-ink shadow-card sm:left-3 sm:top-3">
          Verified vendor
        </span>

        {selected ? (
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white shadow-card sm:right-3 sm:top-3">
            <Check className="h-4 w-4" aria-hidden />
          </span>
        ) : (
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-ink-faint shadow-card transition-colors group-hover:text-brand-600 sm:right-3 sm:top-3">
            <Wrench className="h-3.5 w-3.5" aria-hidden />
          </span>
        )}

        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur sm:bottom-3 sm:left-3">
          <span className="h-1.5 w-1.5 rounded-full bg-success-400" aria-hidden />
          {partner.avgTurnaround || "On request"}
        </span>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="truncate text-[14px] font-semibold tracking-tight text-ink sm:text-[15px]">
          {partner.name}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[12.5px]">
          <span className="flex min-w-0 items-center gap-1 text-ink-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
            <span className="truncate">{partner.city}, {partner.state}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 font-semibold text-ink">
            {partner.rating.toFixed(1)}
            <Star className="h-3.5 w-3.5 fill-warning-400 text-warning-400" aria-hidden />
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {specialities.slice(0, 2).map((s) => (
            <span
              key={s}
              className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700"
            >
              {s}
            </span>
          ))}
          {specialities.length > 2 && (
            <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] text-ink-muted">
              +{specialities.length - 2}
            </span>
          )}
        </div>

        <div className="mt-auto border-t border-line pt-2.5 text-[12.5px]">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-ink">{partner.jobsCompleted ?? 0} jobs</span>
            <span className="text-ink-faint">
              since {partner.since.slice(0, 4) || "—"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
