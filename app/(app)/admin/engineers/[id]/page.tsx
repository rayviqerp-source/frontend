"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  FileCheck2,
  FileText,
  MapPin,
  Phone,
  ShieldCheck,
  ShieldX,
  Star,
  Ticket as TicketIcon,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { can } from "@/lib/permissions";
import { OPEN_STATUSES, TICKET_STATUS_LABELS, TICKET_STATUS_TONES } from "@/lib/constants";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/form";
import { ProgressBar } from "@/components/charts";
import { Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { engineerLoadLabel } from "@/lib/selectors";
import { formatDate } from "@/lib/utils";

export default function AdminEngineerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state, effectiveRole, setEngineerVerification, setEngineerStatus, updateEngineer, toast } = useStore();
  const engineer = state.engineers.find((e) => e.id === params.id);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [note, setNote] = useState("");

  if (!engineer) {
    return (
      <EmptyState
        icon={<Wrench className="h-5 w-5" />}
        title="Engineer not found"
        description="This engineer is not part of the demo service network."
        action={<Link href="/admin/engineers"><Button variant="outline">Back to verification</Button></Link>}
      />
    );
  }

  const canVerify = can(effectiveRole, "admin.engineers.verify");
  const partner = state.partners.find((p) => p.id === engineer.partnerId);
  const assignments = state.tickets.filter((t) => t.assignedEngineerId === engineer.id);
  const open = assignments.filter((t) => OPEN_STATUSES.includes(t.status));
  const completed = assignments.filter((t) => t.status === "completed" || t.status === "closed");
  const reports = state.reports.filter((r) => r.engineerId === engineer.id);
  const load = engineerLoadLabel(engineer);
  const docsVerified = engineer.documents.filter((d) => d.status === "verified").length;

  const decide = (decision: "approved" | "rejected" | "more_info_required", reason: string) => {
    if (decision !== "approved" && !reason.trim()) {
      toast("A reason is required", { description: "Explain what is missing or incorrect.", tone: "error" });
      return;
    }
    setEngineerVerification(engineer.id, decision, reason.trim() || "Approved after document review.");
    setApproveOpen(false);
    setRejectOpen(false);
    setInfoOpen(false);
    setNote("");
  };

  const verifyDocument = (docId: string) => {
    updateEngineer(engineer.id, {
      documents: engineer.documents.map((d) => (d.id === docId ? { ...d, status: "verified" as const } : d)),
    });
    toast("Document marked verified", { description: "Document status was updated locally for this demo." });
  };

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {engineer.name}
            <VerificationBadge status={engineer.verification} />
            <Badge tone={engineer.status === "active" ? "green" : engineer.status === "suspended" ? "red" : "amber"}>{engineer.status}</Badge>
          </span>
        }
        description={`${engineer.id} · ${engineer.city}, ${engineer.state} · ${engineer.experienceYears} years · ${partner?.name ?? "Independent"}`}
        breadcrumbs={<Breadcrumbs />}
        actions={
          <>
            <Link href="/admin/engineers"><Button variant="outline"><ArrowLeft className="h-4 w-4" aria-hidden /> Back</Button></Link>
            {canVerify && engineer.verification !== "approved" && (
              <Button variant="success" onClick={() => setApproveOpen(true)}><BadgeCheck className="h-4 w-4" aria-hidden /> Approve</Button>
            )}
            {canVerify && (
              <>
                <Button variant="outline" onClick={() => setInfoOpen(true)}><ShieldCheck className="h-4 w-4" aria-hidden /> Request info</Button>
                <Button variant="danger" onClick={() => setRejectOpen(true)}><ShieldX className="h-4 w-4" aria-hidden /> Reject</Button>
              </>
            )}
            {canVerify && engineer.status === "active" && (
              <Button variant="outline" onClick={() => setEngineerStatus(engineer.id, "suspended", "Suspended from network")}>Suspend</Button>
            )}
            {canVerify && engineer.status === "suspended" && (
              <Button variant="success" onClick={() => setEngineerStatus(engineer.id, "active", "Reactivated")}>Reactivate</Button>
            )}
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open assignments" value={open.length} hint={`${assignments.length} lifetime`} icon={<TicketIcon className="h-4 w-4" />} tone={open.length ? "warning" : "success"} />
        <StatCard label="Current load" value={`${engineer.currentLoad}/${engineer.maxLoad}`} hint={load.label} icon={<Wrench className="h-4 w-4" />} tone={load.tone === "green" ? "success" : load.tone === "amber" ? "warning" : "danger"} />
        <StatCard label="Rating" value={`${engineer.rating.toFixed(1)}/5`} hint={`${engineer.completedJobs} completed jobs`} icon={<Star className="h-4 w-4" />} tone="success" />
        <StatCard label="Documents verified" value={`${docsVerified}/${engineer.documents.length}`} hint={`${engineer.documents.filter((d) => d.status === "pending" || d.status === "missing").length} pending or missing`} icon={<FileCheck2 className="h-4 w-4" />} tone={docsVerified === engineer.documents.length ? "success" : "warning"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="Verification documents" description="Identity, qualification and payout evidence. RAYVIQ verifies the network; the OEM still owns warranty decisions." />
            <ul className="divide-y divide-line">
              {engineer.documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-ink-muted"><FileText className="h-4 w-4" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-ink">{d.label}</span>
                    <span className="block text-[11px] capitalize text-ink-faint">{d.type.replace(/_/g, " ")}{d.uploadedAt ? ` · uploaded ${formatDate(d.uploadedAt)}` : ""}</span>
                  </span>
                  <Badge tone={d.status === "verified" ? "green" : d.status === "rejected" ? "red" : d.status === "missing" ? "gray" : "amber"}>{d.status}</Badge>
                  {canVerify && d.status !== "verified" && (
                    <Button size="sm" variant="outline" onClick={() => verifyDocument(d.id)}>Mark verified</Button>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[11px] text-ink-muted"><span>Document completion</span><span>{Math.round((docsVerified / Math.max(engineer.documents.length, 1)) * 100)}%</span></div>
              <ProgressBar value={Math.round((docsVerified / Math.max(engineer.documents.length, 1)) * 100)} tone={docsVerified === engineer.documents.length ? "success" : "warning"} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Assignments" description="Recent tickets assigned to this engineer." action={open.length > 0 ? <Badge tone="amber">{open.length} open</Badge> : undefined} />
            {assignments.length === 0 ? (
              <p className="text-[13px] text-ink-muted">No assignments yet.</p>
            ) : (
              <Table>
                <THead columns={[{ label: "Ticket" }, { label: "Issue" }, { label: "Updated" }, { label: "Status" }]} />
                <TBody>
                  {assignments.slice(0, 6).map((t) => (
                    <Tr key={t.id} onClick={() => router.push(`/oem/tickets/${t.id}`)}>
                      <Td><span className="font-mono text-[11px] font-medium text-ink">{t.ref}</span></Td>
                      <Td><span className="block max-w-64 truncate text-[12px] text-ink-soft">{t.issue.category}</span></Td>
                      <Td><span className="text-[11px] text-ink-faint">{formatDate(t.updatedAt)}</span></Td>
                      <Td><Badge tone={TICKET_STATUS_TONES[t.status]} dot>{TICKET_STATUS_LABELS[t.status]}</Badge></Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader title="Service reports" description={`${reports.length} report${reports.length === 1 ? "" : "s"} submitted by this engineer.`} />
            {reports.length === 0 ? (
              <p className="text-[13px] text-ink-muted">No reports submitted.</p>
            ) : (
              <ul className="divide-y divide-line">
                {reports.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2 py-2.5 text-[13px]">
                    <span className="font-mono text-[11px] text-ink">{r.id}</span>
                    <span className="min-w-0 flex-1 truncate text-ink-muted">{r.diagnosis}</span>
                    <Badge tone={r.status === "approved" ? "green" : r.status === "rejected" ? "red" : "amber"}>{r.status.replace(/_/g, " ")}</Badge>
                    <Link href={`/oem/reports/${r.id}`} className="text-[11px] font-medium text-brand-700">View</Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Profile" />
            <dl className="space-y-3 text-[13px]">
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Phone</dt><dd className="mt-0.5 flex items-center gap-1.5 text-ink-soft"><Phone className="h-3.5 w-3.5" aria-hidden /> {engineer.phone}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Email</dt><dd className="mt-0.5 text-ink-soft">{engineer.email}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Service area</dt><dd className="mt-0.5 flex items-center gap-1.5 text-ink-soft"><MapPin className="h-3.5 w-3.5" aria-hidden /> {engineer.city}, {engineer.state} · {engineer.serviceRadiusKm} km</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Partner</dt><dd className="mt-0.5 text-ink-soft">{partner?.name ?? "Independent"}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Joined</dt><dd className="mt-0.5 text-ink-soft">{formatDate(engineer.joinedAt)}</dd></div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Skills & certifications" />
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Skills</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{engineer.skills.map((s) => <Badge key={s} tone="gray">{s}</Badge>)}</div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Certifications</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{engineer.certifications.length ? engineer.certifications.map((s) => <Badge key={s} tone="blue">{s}</Badge>) : <span className="text-[12px] text-ink-muted">None recorded</span>}</div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Product expertise</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{engineer.productExpertise.map((s) => <Badge key={s} tone="cyan">{s}</Badge>)}</div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Quality" />
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between"><dt className="text-ink-muted">Acceptance</dt><dd className="font-medium text-ink">{engineer.acceptanceRate}%</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Rejection</dt><dd className="font-medium text-ink">{engineer.rejectionRate}%</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Report quality</dt><dd className="font-medium text-ink">{engineer.reportQualityScore}/100</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Avg response</dt><dd className="font-medium text-ink">{engineer.avgResponseMins} min</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Completed</dt><dd className="font-medium text-ink">{completed.length}</dd></div>
            </dl>
            {engineer.verification === "approved" && (
              <p className="mt-3 rounded-lg border border-success-100 bg-success-50 px-3 py-2 text-[11px] leading-5 text-success-700">
                Approved by RAYVIQ. The verification decision is recorded in the audit trail.
              </p>
            )}
          </Card>
        </div>
      </div>

      <Modal open={approveOpen} onClose={() => setApproveOpen(false)} title="Approve engineer" description="Approval lets the engineer receive offers from OEMs." footer={<><Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button><Button variant="success" onClick={() => decide("approved", note)}>Approve engineer</Button></>}>
        <Textarea label="Approval note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional internal note for the audit trail." />
      </Modal>

      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Request more information" description="The engineer is notified to re-upload or correct documents." footer={<><Button variant="outline" onClick={() => setInfoOpen(false)}>Cancel</Button><Button disabled={!note.trim()} onClick={() => decide("more_info_required", note)}>Send request</Button></>}>
        <Textarea label="What is needed?" required value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Upload a clearer electrical qualification certificate." />
      </Modal>

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject engineer verification" description="Rejection blocks offers until the engineer corrects the record." footer={<><Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button><Button variant="danger" disabled={!note.trim()} onClick={() => decide("rejected", note)}>Reject verification</Button></>}>
        <Textarea label="Reason" required value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Identity document does not match the PAN record." />
      </Modal>
    </div>
  );
}
