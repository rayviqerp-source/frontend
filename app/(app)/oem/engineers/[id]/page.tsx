"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BadgeCheck, FileText, MapPin, Phone, ShieldCheck, Star, Wrench } from "lucide-react";
import { useStore } from "@/lib/store";
import { can } from "@/lib/permissions";
import { engineerLoadLabel } from "@/lib/selectors";
import { OPEN_STATUSES } from "@/lib/constants";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { ProgressBar } from "@/components/charts";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatDate } from "@/lib/utils";

export default function EngineerDetailPage() {
  const params = useParams<{ id: string }>();
  const { state, effectiveRole, setEngineerVerification, setEngineerStatus, toast } = useStore();
  const engineer = state.engineers.find((e) => e.id === params.id);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [moreInfoOpen, setMoreInfoOpen] = useState(false);
  const [note, setNote] = useState("");

  if (!engineer) {
    return (
      <EmptyState
        icon={<Wrench className="h-5 w-5" />}
        title="Engineer not found"
        description="This engineer does not exist in the demo network."
        action={<Link href="/oem/engineers"><Button variant="outline">Back to network</Button></Link>}
      />
    );
  }

  const canVerify = can(effectiveRole, "admin.engineers.verify");
  const load = engineerLoadLabel(engineer);
  const assignments = state.tickets.filter((t) => t.assignedEngineerId === engineer.id);
  const open = assignments.filter((t) => OPEN_STATUSES.includes(t.status));
  const completed = assignments.filter((t) => t.status === "completed" || t.status === "closed");
  const visits = state.visits.filter((v) => v.engineerId === engineer.id);
  const partner = state.partners.find((p) => p.id === engineer.partnerId);

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {engineer.name}
            <VerificationBadge status={engineer.verification} />
            <Badge tone={engineer.availability === "available" ? "green" : engineer.availability === "busy" ? "amber" : "gray"}>
              {engineer.availability}
            </Badge>
          </span>
        }
        description={`${engineer.id} · ${engineer.city}, ${engineer.state} · ${engineer.experienceYears} years experience${partner ? ` · ${partner.name}` : ""}`}
        breadcrumbs={<Breadcrumbs />}
        actions={
          <>
            <Link href="/oem/engineers"><Button variant="outline"><ArrowLeft className="h-4 w-4" aria-hidden /> Back</Button></Link>
            {canVerify && (
              <>
                <Button variant="success" onClick={() => setVerifyOpen(true)}>
                  <BadgeCheck className="h-4 w-4" aria-hidden /> Approve
                </Button>
                <Button variant="outline" onClick={() => setMoreInfoOpen(true)}>Request info</Button>
                <Button variant="danger" onClick={() => setRejectOpen(true)}>Reject</Button>
              </>
            )}
            {can(effectiveRole, "admin.engineers.verify") && engineer.status === "active" && (
              <Button variant="outline" onClick={() => { setEngineerStatus(engineer.id, "suspended", "Suspended from profile"); }}>
                Suspend
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Rating" value={`${engineer.rating.toFixed(1)}/5`} icon={<Star className="h-4 w-4" />} hint={`${engineer.completedJobs} lifetime jobs`} tone="success" />
        <StatCard label="Acceptance rate" value={`${engineer.acceptanceRate}%`} icon={<BadgeCheck className="h-4 w-4" />} hint={`${engineer.rejectionRate}% declined`} />
        <StatCard label="Report quality" value={`${engineer.reportQualityScore}/100`} icon={<FileText className="h-4 w-4" />} hint="OEM review score" tone="brand" />
        <StatCard label="Current load" value={`${engineer.currentLoad}/${engineer.maxLoad}`} icon={<Wrench className="h-4 w-4" />} hint={load.label} tone={load.tone === "green" ? "success" : load.tone === "amber" ? "warning" : "danger"} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="Profile" description="Contact, coverage and service preferences" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Fact label="Phone" value={engineer.phone} />
              <Fact label="Email" value={engineer.email} />
              <Fact label="Address" value={`${engineer.address}, ${engineer.city}, ${engineer.state} ${engineer.pincode}`} />
              <Fact label="Service radius" value={`${engineer.serviceRadiusKm} km`} />
              <Fact label="Languages" value={engineer.languages.join(", ")} />
              <Fact label="Joined" value={formatDate(engineer.joinedAt)} />
              <Fact label="Partner" value={partner?.name ?? "Independent"} />
              <Fact label="Exclusive OEM" value={engineer.exclusiveOemId ?? "Multi-OEM"} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Skills & expertise" />
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Product expertise</p>
                <div className="flex flex-wrap gap-1.5">
                  {engineer.productExpertise.map((p) => <Badge key={p} tone="blue">{p.replace(/_/g, " ")}</Badge>)}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {engineer.skills.map((s) => <Badge key={s} tone="gray">{s}</Badge>)}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Certifications</p>
                <div className="flex flex-wrap gap-1.5">
                  {engineer.certifications.map((c) => <Badge key={c} tone="violet">{c}</Badge>)}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Assigned work" description={`${open.length} open · ${completed.length} completed`} />
            {assignments.length === 0 ? (
              <p className="text-[13px] text-ink-muted">No tickets assigned yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {assignments.slice(0, 6).map((t) => (
                  <li key={t.id}>
                    <Link href={`/oem/tickets/${t.id}`} className="flex flex-wrap items-center gap-2 py-2.5 hover:bg-surface-alt/60">
                      <span className="font-mono text-[12px] text-ink">{t.ref}</span>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-ink-muted">{t.issue.category} · {t.location.city}</span>
                      <Badge tone={OPEN_STATUSES.includes(t.status) ? "amber" : "green"}>{t.status.replace(/_/g, " ")}</Badge>
                      <span className="text-[11px] text-ink-faint">{formatDate(t.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Documents & verification" description="Onboarding evidence for this engineer" />
            <ul className="divide-y divide-line">
              {engineer.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-2 py-2.5">
                  <FileText className="h-4 w-4 text-ink-faint" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-ink">{d.label}</p>
                    <p className="text-[11px] text-ink-faint">{d.type} · {d.uploadedAt ? formatDate(d.uploadedAt) : "not uploaded"}</p>
                  </div>
                  <Badge tone={d.status === "verified" ? "green" : d.status === "rejected" ? "red" : d.status === "missing" ? "gray" : "amber"}>
                    {d.status}
                  </Badge>
                </li>
              ))}
            </ul>
            <div className="mt-3 rounded-lg bg-surface-alt px-3 py-2 text-[11px] text-ink-muted">
              Bank details: {engineer.bankDetailsProvided ? "provided" : "pending"} · onboarding step {engineer.onboardingStep}/6
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Performance" />
            <div className="space-y-4">
              {[
                { label: "Acceptance", value: engineer.acceptanceRate, tone: "success" as const },
                { label: "Report quality", value: engineer.reportQualityScore, tone: "brand" as const },
                { label: "On-time response", value: Math.max(0, 100 - engineer.avgResponseMins / 3), tone: "warning" as const },
              ].map((m) => (
                <div key={m.label}>
                  <div className="mb-1.5 flex justify-between text-[12px]">
                    <span className="text-ink-muted">{m.label}</span>
                    <span className="font-semibold text-ink">{Math.round(m.value)}%</span>
                  </div>
                  <ProgressBar value={m.value} tone={m.tone} />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-ink-faint">Avg. response {engineer.avgResponseMins} min · load {load.label}</p>
          </Card>

          <Card>
            <CardHeader title="Field activity" description={`${visits.length} visits recorded`} />
            <ul className="space-y-2">
              {visits.slice(0, 4).map((v) => (
                <li key={v.id} className="flex items-center gap-2 text-[12px]">
                  <MapPin className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{formatDate(v.scheduledFor)} · {v.slot}</span>
                  <Badge tone={v.status === "completed" ? "green" : v.status === "in_progress" ? "blue" : "cyan"}>{v.status.replace(/_/g, " ")}</Badge>
                </li>
              ))}
              {visits.length === 0 && <li className="text-[12px] text-ink-muted">No visits yet.</li>}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Quick contact" />
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => toast("Call simulated", { description: `Would dial ${engineer.phone}.`, tone: "info" })}>
                <Phone className="h-4 w-4" aria-hidden /> {engineer.phone}
              </Button>
              <Link href="/oem/tickets?engineer=1"><Button variant="outline" className="w-full justify-start"><Wrench className="h-4 w-4" aria-hidden /> View assigned tickets</Button></Link>
            </div>
          </Card>

          <Card>
            <CardHeader title="Compliance" />
            <p className="text-[12px] leading-5 text-ink-muted">
              <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-brand-600" aria-hidden />
              Verification confirms documents and skills. Warranty decisions remain with the OEM, not the engineer or
              RAYVIQ.
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        title="Approve engineer verification"
        description="This verifies documents and activates the engineer for assignment offers."
        footer={
          <>
            <Button variant="outline" onClick={() => setVerifyOpen(false)}>Cancel</Button>
            <Button variant="success" onClick={() => { setEngineerVerification(engineer.id, "approved", note || "Documents verified"); setVerifyOpen(false); setNote(""); }}>Approve</Button>
          </>
        }
      >
        <Textarea label="Verification note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Documents checked, reference number…" />
      </Modal>

      <Modal
        open={moreInfoOpen}
        onClose={() => setMoreInfoOpen(false)}
        title="Request more information"
        description="The engineer will be asked to supply the missing documents or clarification."
        footer={
          <>
            <Button variant="outline" onClick={() => setMoreInfoOpen(false)}>Cancel</Button>
            <Button disabled={!note.trim()} onClick={() => { setEngineerVerification(engineer.id, "more_info_required", note.trim()); setMoreInfoOpen(false); setNote(""); }}>Send request</Button>
          </>
        }
      >
        <Textarea label="What is required?" required value={note} onChange={(e) => setNote(e.target.value)} />
      </Modal>

      <ConfirmDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={(reason) => { setEngineerVerification(engineer.id, "rejected", reason || "Verification rejected"); setRejectOpen(false); }}
        title="Reject verification?"
        message="The engineer will be marked inactive and cannot receive offers. You can re-open verification later."
        confirmLabel="Reject"
        tone="danger"
        requireReason
      />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 text-[13px] leading-5 text-ink-soft">{value || "—"}</p>
    </div>
  );
}
