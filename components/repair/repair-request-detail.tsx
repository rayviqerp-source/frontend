"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleSlash,
  Clock,
  FileText,
  ImageIcon,
  MapPin,
  Phone,
  PlayCircle,
  UserRound,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { REPAIR_SERVICE_MODE_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { RepairStatusBadge } from "@/components/repair/repair-status-badge";
import { RepairTracker } from "@/components/repair/repair-tracker";
import { cn, formatDate, formatDateTime, relativeTime } from "@/lib/utils";

/**
 * Repair request detail — used by the repair company inbox and the admin
 * oversight view.
 *
 * `mode="company"` exposes the accept / decline / progress actions; the
 * admin view is read-only apart from status intervention.
 */
export function RepairRequestDetail({
  params,
  mode,
  backHref,
}: {
  params: Promise<{ id: string }>;
  mode: "company" | "admin";
  backHref: string;
}) {
  const router = useRouter();
  const { state, respondToRepairRequest, setRepairRequestStatus, toast } = useStore();
  const [note, setNote] = useState("");
  const [showDecline, setShowDecline] = useState(false);

  const { id } = use(params);
  const request = state.repairRequests.find((r) => r.id === id);
  const company = request ? state.partners.find((p) => p.id === request.companyId) : undefined;
  const customer = request ? state.customers.find((c) => c.id === request.customerId) : undefined;

  if (!request) {
    return (
      <div>
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Repair request not found"
          description="This request doesn't exist or has been removed."
          action={
            <Link href={backHref}>
              <Button variant="outline">Back to repair requests</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const decline = () => {
    if (!note.trim()) {
      toast("A reason is required to decline", { tone: "error" });
      return;
    }
    const ok = respondToRepairRequest(request.id, "rejected", note.trim());
    if (ok) {
      setNote("");
      setShowDecline(false);
      toast("Request declined", {
        description: "The customer can see the reason on their tracker.",
        tone: "info",
      });
    } else {
      toast("Could not decline this request", { tone: "error" });
    }
  };

  const accept = () => {
    const ok = respondToRepairRequest(request.id, "accepted", note.trim() || undefined);
    if (ok) {
      setNote("");
      toast("Request accepted", {
        description: "The customer has been notified — you can now start the repair.",
      });
    } else {
      toast("Could not accept this request", { tone: "error" });
    }
  };

  const advance = (to: "in_progress" | "completed") => {
    const ok = setRepairRequestStatus(request.id, to, note.trim() || undefined);
    if (ok) {
      setNote("");
      toast(to === "in_progress" ? "Repair started" : "Repair completed");
    } else {
      toast("Status change not allowed", { tone: "error" });
    }
  };

  const canRespond = mode === "company" && request.status === "pending";
  const canStart = mode === "company" && request.status === "accepted";
  const canComplete = mode === "company" && request.status === "in_progress";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Repair requests
        </Link>
        <RepairStatusBadge status={request.status} />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Repair request
            </p>
            <h1 className="mt-0.5 font-mono text-xl font-bold tracking-tight text-ink">
              {request.ref}
            </h1>
            <p className="mt-1 text-xs text-ink-faint">
              Raised {relativeTime(request.createdAt)} · updated {relativeTime(request.updatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">{request.problem.category}</Badge>
            {company && <Badge tone="gray">{company.name}</Badge>}
          </div>
        </div>

        <div className="mt-4">
          <RepairTracker status={request.status} />
        </div>
      </Card>

      {/* -------- Company actions -------- */}
      {(canRespond || canStart || canComplete) && (
        <Card>
          <CardHeader
            title="Respond to this request"
            description="Accept the job, add a note for the customer and keep the status up to date."
          />
          <div className="space-y-3">
            <Textarea
              id="repair-response-note"
              label={canRespond ? "Note for the customer (optional)" : "Note (optional)"}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                canRespond
                  ? "e.g. Engineer visit scheduled for 06 Nov, 10:00 – 12:00."
                  : "e.g. Fan module replaced, unit under test."
              }
            />

            {showDecline ? (
              <div className="rounded-lg border border-danger-100 bg-danger-50 p-3">
                <p className="text-[13px] font-medium text-danger-700">
                  Why are you declining this request?
                </p>
                <p className="mt-0.5 text-[12px] leading-5 text-danger-600/80">
                  The customer sees this reason on their tracker.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="danger" size="sm" onClick={decline}>
                    <CircleSlash className="h-3.5 w-3.5" aria-hidden /> Confirm decline
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDecline(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {canRespond && (
                  <>
                    <Button onClick={accept}>
                      <CheckCircle2 className="h-4 w-4" aria-hidden /> Accept request
                    </Button>
                    <Button variant="outline" onClick={() => setShowDecline(true)}>
                      <CircleSlash className="h-4 w-4" aria-hidden /> Decline
                    </Button>
                  </>
                )}
                {canStart && (
                  <>
                    <Button onClick={() => advance("in_progress")}>
                      <PlayCircle className="h-4 w-4" aria-hidden /> Start repair
                    </Button>
                    <Button variant="outline" onClick={() => setShowDecline(true)}>
                      <CircleSlash className="h-4 w-4" aria-hidden /> Decline
                    </Button>
                  </>
                )}
                {canComplete && (
                  <Button variant="success" onClick={() => advance("completed")}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> Mark completed
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {request.status === "rejected" && request.rejectionReason && (
        <Card className="border-danger-100 bg-danger-50 p-4">
          <p className="text-[13px] font-medium text-danger-700">Declined</p>
          <p className="mt-1 text-[12.5px] leading-6 text-danger-600/90">
            {request.rejectionReason}
          </p>
        </Card>
      )}

      {/* -------- Customer + inverter -------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Customer" />
          <dl className="space-y-2 text-[13px]">
            <div className="flex items-center gap-2 text-ink-soft">
              <UserRound className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
              <span className="font-medium text-ink">
                {customer?.name ?? request.contact.name}
              </span>
              {customer?.company && customer.company !== customer.name && (
                <span className="text-ink-muted">· {customer.company}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-ink-soft">
              <Phone className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
              {request.contact.phone}
            </div>
            {request.contact.email && (
              <div className="truncate text-ink-muted">{request.contact.email}</div>
            )}
            <div className="flex items-start gap-2 text-ink-soft">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
              <span>
                {request.contact.address}
                <br />
                {request.contact.city}, {request.contact.state} {request.contact.pincode}
              </span>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Inverter" />
          <dl className="space-y-1.5 text-[13px]">
            {[
              ["Brand", request.inverter.brand],
              ["Model", request.inverter.model ?? "—"],
              ["Capacity", request.inverter.capacityKw ? `${request.inverter.capacityKw} kW` : "—"],
              ["Serial no.", request.inverter.serialNumber ?? "—"],
              ["Installed", request.inverter.yearOfInstallation ?? "—"],
              [
                "Service mode",
                REPAIR_SERVICE_MODE_LABELS[request.serviceMode ?? ""] ?? "On-site visit",
              ],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ink-faint">{k}</dt>
                <dd className="text-right font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {request.preferredDate && (
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-muted">
              <CalendarClock className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
              Customer prefers {formatDate(request.preferredDate)}
            </p>
          )}
        </Card>
      </div>

      {/* -------- Problem -------- */}
      <Card>
        <CardHeader title="Reported problem" />
        <p className="text-[13px] leading-6 text-ink-soft">{request.problem.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {request.problem.errorCode && (
            <span className="rounded-lg border border-line bg-surface-alt/60 px-3 py-2 font-mono text-xs font-medium text-ink">
              {request.problem.errorCode}
            </span>
          )}
          {request.attachment && (
            <span className="flex items-center gap-1.5 text-[12px] text-ink-muted">
              <ImageIcon className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
              {request.attachment.name} · {request.attachment.sizeKb} KB
            </span>
          )}
        </div>
        {request.companyNote && (
          <p className="mt-3 rounded-lg border border-line bg-surface-alt/60 px-3 py-2.5 text-[12.5px] leading-6 text-ink-soft">
            <span className="font-medium text-ink">Company note:</span> {request.companyNote}
          </p>
        )}
      </Card>

      {/* -------- Timeline -------- */}
      <Card>
        <CardHeader title="Timeline" />
        <div className="relative pl-6">
          {[...request.timeline].reverse().map((e) => (
            <div key={e.id} className="relative mb-6 last:mb-0">
              <span
                className={cn(
                  "absolute -left-[23px] top-2 h-3 w-3 rounded-full ring-4 ring-surface shadow-card",
                  e.type === "closure"
                    ? "bg-success-500"
                    : e.type === "status"
                      ? "bg-brand-500"
                      : "bg-accent-500",
                )}
              />
              <div className="flex items-start gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{e.title}</p>
                  {e.detail && (
                    <p className="mt-0.5 text-[12px] leading-5 text-ink-soft">{e.detail}</p>
                  )}
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-faint">
                    <Clock className="h-3 w-3" aria-hidden /> {e.actor}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-ink-faint">{formatDateTime(e.at)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {mode === "admin" && (
        <Card className="p-4">
          <p className="flex items-start gap-2 text-[12.5px] leading-6 text-ink-muted">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
            Oversight view — every request across all repair companies is monitored from the
            admin repair requests page.
          </p>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/repair-requests")}>
              Open admin oversight
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
