"use client";

import Image from "next/image";
import { Building2, Check, Clock3, MapPin, Star, Wrench } from "lucide-react";
import { REPAIR_SERVICE_MODE_LABELS } from "@/lib/constants";
import type { ServicePartner } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Repair vendor card — the public directory card. Shows the company's real
 * logo on a white background (never cropped), with the VENDOR and turnaround
 * badges overlaid on the image area. The details footer stays compact and
 * matches the Marketplace engineer cards.
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
  const logo = partner.image ?? partner.logoUrl;

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
      {/* logo area */}
      <div className="relative h-28 shrink-0 overflow-hidden border-b border-line bg-white">
        {logo ? (
          <Image
            src={logo}
            alt={`${partner.name} logo`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain p-5"
            unoptimized={logo.startsWith("data:")}
          />
        ) : (
          <span className="flex h-full items-center justify-center text-ink-faint" aria-hidden>
            <Building2 className="h-10 w-10" />
          </span>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-md bg-white/95 px-2 py-1 text-[9.5px] font-bold uppercase tracking-widest text-ink shadow-card sm:left-3 sm:top-3">
          Repair vendor
        </span>
        {selected && (
          <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white shadow-card sm:right-3 sm:top-3">
            <Check className="h-4 w-4" aria-hidden />
          </span>
        )}
        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur sm:bottom-3 sm:left-3">
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
