"use client";

import Link from "next/link";
import { Suspense, use } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Clock,
  FileText,
  ImageIcon,
  MapPin,
  Phone,
  UserRound,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useActiveCustomer } from "@/lib/session";
import { REPAIR_SERVICE_MODE_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingScreen } from "@/components/ui/states";
import { RepairStatusBadge } from "@/components/repair/repair-status-badge";
import { RepairTracker } from "@/components/repair/repair-tracker";
import { cn, formatDate, formatDateTime, relativeTime } from "@/lib/utils";

/**
 * Customer repair-request tracker — the detail view behind
 * /client/repairs. Shows the live status, the company handling the job and
 * the full timeline of what happened.
 */
export default function ClientRepairDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading request…" />}>
      <RepairDetailContent params={params} />
    </Suspense>
  );
}

function RepairDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state } = useStore();

  const customer = useActiveCustomer();
  const request = state.repairRequests.find((r) => r.id === id);
  const company = request
    ? state.partners.find((p) => p.id === request.companyId)
    : undefined;

  if (!customer) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<UserRound className="h-5 w-5" />}
          title="You're not signed in"
          description="Sign in to view your repair requests."
          action={
            <Link href="/client/login">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!request || request.customerId !== customer.id) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-6">
          <EmptyState
            icon={<AlertTriangle className="h-6 w-6" />}
            title="Request not found"
            description="This repair request doesn't exist or isn't linked to your account."
            action={
              <Link href="/client/repairs">
                <Button variant="outline">My repair requests</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/client/repairs"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> My repair requests
        </Link>
        <RepairStatusBadge status={request.status} />
      </div>

      {/* Hero */}
      <Card className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
          Repair request
        </p>
        <h1 className="mt-0.5 flex items-center gap-2 text-2xl font-bold tracking-tight text-ink">
          {request.ref}
        </h1>
        <p className="mt-1 text-xs text-ink-faint">
          Raised {relativeTime(request.createdAt)} · last update {relativeTime(request.updatedAt)}
        </p>

        <div className="mt-4">
          <RepairTracker status={request.status} />
        </div>

        {request.companyNote && request.status === "accepted" && (
          <p className="mt-3 rounded-lg border border-success-100 bg-success-50 px-3 py-2.5 text-[12px] leading-5 text-success-700">
            <span className="font-semibold">{company?.name}:</span> {request.companyNote}
          </p>
        )}
        {request.rejectionReason && request.status === "rejected" && (
          <p className="mt-3 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-[12px] leading-5 text-danger-700">
            <span className="font-semibold">Reason:</span> {request.rejectionReason}
          </p>
        )}
      </Card>

      {/* Inverter + problem */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-brand-600" aria-hidden />
            <h2 className="text-sm font-semibold tracking-tight text-ink">Inverter</h2>
          </div>
          <dl className="space-y-1.5 text-[13px]">
            {[
              ["Brand", request.inverter.brand],
              ["Model", request.inverter.model ?? "—"],
              ["Capacity", request.inverter.capacityKw ? `${request.inverter.capacityKw} kW` : "—"],
              ["Serial no.", request.inverter.serialNumber ?? "—"],
              ["Installed", request.inverter.yearOfInstallation ?? "—"],
              ["Service mode", REPAIR_SERVICE_MODE_LABELS[request.serviceMode ?? ""] ?? "On-site visit"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ink-faint">{k}</dt>
                <dd className="text-right font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-600" aria-hidden />
            <h2 className="text-sm font-semibold tracking-tight text-ink">Site & contact</h2>
          </div>
          <p className="text-[13px] leading-6 text-ink-soft">{request.contact.address}</p>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            {request.contact.city}, {request.contact.state} {request.contact.pincode}
          </p>
          <div className="mt-3 space-y-1 border-t border-line pt-3 text-[12.5px] text-ink-muted">
            <p className="flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
              {request.contact.name}
            </p>
            {request.contact.company && (
              <p className="truncate text-ink-faint">{request.contact.company}</p>
            )}
            <p className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
              {request.contact.phone}
            </p>
            {request.contact.email && (
              <p className="truncate text-ink-faint">{request.contact.email}</p>
            )}
          </div>
        </Card>
      </div>

      {/* Problem */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-600" aria-hidden />
          <h2 className="text-sm font-semibold tracking-tight text-ink">Reported problem</h2>
        </div>
        <Badge tone="blue">{request.problem.category}</Badge>
        <p className="mt-2.5 text-[13px] leading-6 text-ink-soft">{request.problem.description}</p>
        {request.problem.errorCode && (
          <div className="mt-3 rounded-lg border border-line bg-surface-alt/60 px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Error code
            </p>
            <p className="mt-0.5 font-mono text-xs font-medium text-ink">
              {request.problem.errorCode}
            </p>
          </div>
        )}
        {request.attachment && (
          <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-muted">
            <ImageIcon className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
            {request.attachment.name} · {request.attachment.sizeKb} KB
          </p>
        )}
        {request.preferredDate && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-muted">
            <CalendarClock className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
            Preferred date: {formatDate(request.preferredDate)}
          </p>
        )}
      </Card>

      {/* Company */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-brand-600" aria-hidden />
          <h2 className="text-sm font-semibold tracking-tight text-ink">Repair company</h2>
        </div>
        {company ? (
          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-ink">{company.name}</p>
            <p className="text-[11.5px] text-ink-muted">
              {company.city}, {company.state} · {company.contactName} · {company.phone}
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              {(company.repairSpecialities ?? []).map((s) => (
                <Badge key={s} tone="blue" className="text-[10px]">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-ink-muted">Company details unavailable.</p>
        )}
      </Card>

      {/* Timeline */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-brand-600" aria-hidden />
          <h2 className="text-sm font-semibold tracking-tight text-ink">Timeline</h2>
        </div>
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
                  <p className="mt-0.5 text-[11px] text-ink-faint">{e.actor}</p>
                </div>
                <span className="shrink-0 text-[11px] text-ink-faint">
                  {formatDateTime(e.at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-ink-muted">
            Need to change something? Call the repair company directly.
          </p>
          <Link href="/client/repairs">
            <Button variant="outline" size="sm">
              All my requests
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
