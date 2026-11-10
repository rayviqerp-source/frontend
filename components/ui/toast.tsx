"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismissToast } = useStore();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface px-4 py-3 shadow-pop animate-slide-in-right",
            t.tone === "success" ? "border-success-100" : t.tone === "error" ? "border-danger-100" : "border-line",
          )}
        >
          <span
            className={cn(
              "mt-0.5 shrink-0",
              t.tone === "success" ? "text-success-600" : t.tone === "error" ? "text-danger-600" : "text-brand-600",
            )}
          >
            {t.tone === "success" ? (
              <CheckCircle2 className="h-4.5 w-4.5" />
            ) : t.tone === "error" ? (
              <XCircle className="h-4.5 w-4.5" />
            ) : (
              <Info className="h-4.5 w-4.5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-ink">{t.title}</p>
            {t.description && (
              <p className="mt-0.5 text-xs leading-5 text-ink-muted">{t.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
            className="rounded p-0.5 text-ink-faint hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
