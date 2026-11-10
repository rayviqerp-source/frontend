import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface-alt px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink-faint ring-1 ring-line">
          {icon}
        </span>
      )}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-[13px] leading-5 text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this view. Try again, or contact support if the problem persists.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-danger-100 bg-danger-50 px-6 py-12 text-center">
      <h3 className="text-sm font-semibold text-danger-700">{title}</h3>
      <p className="mt-1.5 max-w-md text-[13px] leading-5 text-danger-600/80">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("block animate-shimmer rounded-md bg-line/70", className)}
    />
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2.5 p-4" aria-busy aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton
              key={c}
              className={cn("h-4 flex-1", c === 0 && "max-w-32", c === cols - 1 && "max-w-20")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function LoadingScreen({ label = "Loading RAYVIQ…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-ink-muted">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      {label}
    </span>
  );
}
