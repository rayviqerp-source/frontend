"use client";

import { Check, Clock3, MapPin, Star, Wrench } from "lucide-react";
import { InverterBackdrop } from "@/components/ui/inverter-backdrop";
import { REPAIR_SERVICE_MODE_LABELS } from "@/lib/constants";
import { inverterArtForPartner } from "@/lib/inverter-art";
import type { ServicePartner } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

const COMPANY_COLORS = ["#2554e0", "#0e7c66", "#b45309", "#7c3aed", "#be123c", "#0369a1"];

function companyColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h + ch.charCodeAt(0)) % COMPANY_COLORS.length;
  return COMPANY_COLORS[h];
}

/**
 * Repair vendor card — mirrors the Marketplace engineer card: a coloured
 * banner with inverter artwork, the company logo (or a branded initials
 * placeholder), a clear VENDOR pill, and a compact details footer.
 * Used by the public repair directory and by the request form's picker.
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
  const modes = (partner.serviceModes ?? [])
    .map((m) => REPAIR_SERVICE_MODE_LABELS[m] ?? m)
    .join(" · ");

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
      {/* photo / logo banner */}
      <div
        className="relative h-28 shrink-0 overflow-hidden"
        style={{ backgroundColor: companyColor(partner.name) }}
      >
        <InverterBackdrop src={inverterArtForPartner(partner.repairSpecialities)} />
        <span
          className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/25"
          aria-hidden
        />
        <span
          className={cn(
            "absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-2xl text-lg font-bold text-white ring-2 ring-white/80 shadow-pop transition-transform duration-200 group-hover:scale-105 sm:h-20 sm:w-20 sm:text-xl",
            !partner.logoUrl && "bg-gradient-to-br from-white/20 to-black/20",
          )}
          style={partner.logoUrl ? { backgroundColor: "#ffffff" } : undefined}
        >
          {partner.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- vendor logo from a data URL or hosted URL
            <img src={partner.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(partner.name)
          )}
        </span>
        <span className="absolute left-2.5 top-2.5 rounded-md bg-white/95 px-2 py-1 text-[9.5px] font-bold uppercase tracking-widest text-ink shadow-card sm:left-3 sm:top-3">
          Repair vendor
        </span>
        {selected && (
          <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white shadow-card sm:right-3 sm:top-3">
            <Check className="h-4 w-4" aria-hidden />
          </span>
        )}
        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur sm:bottom-3 sm:left-3">
          <span className="h-1.5 w-1.5 rounded-full bg-success-400" aria-hidden />
          {partner.avgTurnaround || "Turnaround on request"}
        </span>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold tracking-tight text-ink">
              {partner.name}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-ink-muted">
              <MapPin className="h-3 w-3 shrink-0 text-ink-faint" aria-hidden />
              {partner.city}, {partner.state}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-ink">
            <Star className="h-3 w-3 fill-warning-400 text-warning-400" aria-hidden />
            {partner.rating.toFixed(1)}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {(partner.repairSpecialities ?? []).slice(0, 3).map((s) => (
            <span
              key={s}
              className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700"
            >
              {s}
            </span>
          ))}
        </div>

        <div className="mt-auto border-t border-line pt-2.5 text-[11px] text-ink-faint">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Wrench className="h-3 w-3" aria-hidden />
              {partner.jobsCompleted ?? 0} jobs
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3" aria-hidden />
              {modes || "On-site service"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
