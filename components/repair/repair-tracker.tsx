"use client";

import { CheckCircle2, CircleSlash, Clock } from "lucide-react";
import { REPAIR_PIPELINE, REPAIR_STATUS_LABELS } from "@/lib/constants";
import type { RepairRequestStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Horizontal progress tracker for an inverter repair request.
 *
 * Mirrors the pipeline the customer sees in the app: Pending → Accepted →
 * In Progress → Completed. A declined request leaves the pipeline and is
 * called out separately.
 */
export function RepairTracker({
  status,
  className,
}: {
  status: RepairRequestStatus;
  className?: string;
}) {
  const declined = status === "rejected";
  const currentIndex = REPAIR_PIPELINE.indexOf(status);

  return (
    <div className={className}>
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {REPAIR_PIPELINE.map((step, i) => {
          const done = !declined && currentIndex > i;
          const active = !declined && currentIndex === i;
          return (
            <li key={step} className="flex flex-1 items-center gap-1.5 sm:gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  done
                    ? "bg-success-500 text-white"
                    : active
                      ? "bg-brand-600 text-white"
                      : "bg-surface-alt text-ink-faint",
                )}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden truncate text-[11.5px] font-medium sm:block",
                  active ? "text-ink" : done ? "text-ink-soft" : "text-ink-faint",
                )}
              >
                {REPAIR_STATUS_LABELS[step]}
              </span>
              {i < REPAIR_PIPELINE.length - 1 && (
                <span
                  className={cn(
                    "h-px min-w-3 flex-1",
                    done ? "bg-success-200" : "bg-line",
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>

      {declined && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-[12px] leading-5 text-danger-700">
          <CircleSlash className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          This request was declined by the repair company. You can raise a new request
          with another company.
        </p>
      )}

      {!declined && status === "pending" && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-warning-100 bg-warning-50 px-3 py-2.5 text-[12px] leading-5 text-warning-700">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Waiting for the repair company to accept your request.
        </p>
      )}
    </div>
  );
}
