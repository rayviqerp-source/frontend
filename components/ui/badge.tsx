import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TONES,
} from "@/lib/constants";
import type { TicketPriority, TicketStatus } from "@/lib/types";

export type Tone = "gray" | "blue" | "cyan" | "amber" | "violet" | "green" | "red" | "indigo";

const toneClasses: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-600 ring-slate-200",
  blue: "bg-brand-50 text-brand-700 ring-brand-100",
  cyan: "bg-accent-100 text-accent-600 ring-accent-300/40",
  amber: "bg-warning-50 text-warning-700 ring-warning-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  green: "bg-success-50 text-success-700 ring-success-100",
  red: "bg-danger-50 text-danger-700 ring-danger-100",
  indigo: "bg-info-50 text-info-700 ring-info-100",
};

export function Badge({
  children,
  tone = "gray",
  className,
  dot = false,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  return (
    <Badge tone={TICKET_STATUS_TONES[status]} className={className} dot>
      {TICKET_STATUS_LABELS[status]}
    </Badge>
  );
}

const priorityTone: Record<TicketPriority, Tone> = {
  critical: "red",
  high: "amber",
  medium: "blue",
  low: "gray",
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge tone={priorityTone[priority]} className="uppercase tracking-wide">
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

export function VerificationBadge({ status }: { status: string }) {
  const tone: Tone =
    status === "approved"
      ? "green"
      : status === "rejected"
        ? "red"
        : status === "more_info_required"
          ? "amber"
          : status === "under_verification"
            ? "indigo"
            : status === "submitted"
              ? "blue"
              : "gray";
  return (
    <Badge tone={tone} dot>
      {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </Badge>
  );
}
