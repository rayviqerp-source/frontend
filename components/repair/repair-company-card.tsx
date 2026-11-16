"use client";

import { CheckCircle2, Clock3, MapPin, Star, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { REPAIR_SERVICE_MODE_LABELS } from "@/lib/constants";
import type { ServicePartner } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Selectable repair-company card used by the customer-facing request form.
 * Shows what the customer actually needs to make a choice: where the
 * company sits, what it specialises in, the brands it supports and the
 * usual turnaround time.
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
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex h-full w-full flex-col rounded-2xl border bg-surface p-4 text-left shadow-card transition-all duration-200",
        selected
          ? "border-brand-400 ring-2 ring-brand-100"
          : "border-line hover:border-brand-300 hover:shadow-pop",
      )}
    >
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
        {selected ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-medium text-ink">
            <Star className="h-3 w-3 fill-warning-400 text-warning-400" aria-hidden />
            {partner.rating.toFixed(1)}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1">
        {(partner.repairSpecialities ?? []).slice(0, 3).map((s) => (
          <Badge key={s} tone="blue" className="text-[10px]">
            {s}
          </Badge>
        ))}
      </div>

      <p className="mt-2 text-[11.5px] leading-5 text-ink-muted">
        <span className="font-medium text-ink-soft">Brands:</span>{" "}
        {(partner.brandsServiced ?? []).join(", ") || "All major brands"}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[11px] text-ink-faint">
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-3 w-3" aria-hidden />
          {partner.avgTurnaround ?? "—"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Wrench className="h-3 w-3" aria-hidden />
          {(partner.serviceModes ?? [])
            .map((m) => REPAIR_SERVICE_MODE_LABELS[m] ?? m)
            .join(" · ")}
        </span>
      </div>
    </button>
  );
}
