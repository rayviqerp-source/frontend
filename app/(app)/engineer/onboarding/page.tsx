"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  BadgeCheck,
  Check,
  FileText,
  ListChecks,
  Send,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useEngineerScope } from "@/components/engineer/scope";
import { VerificationBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/states";
import { ProgressBar } from "@/components/charts";
import { Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatDate } from "@/lib/utils";
import type { EngineerDocument, VerificationStatus } from "@/lib/types";

const STEP_LABELS = [
  "Basic profile",
  "Service area & skills",
  "Documents & certifications",
  "Bank details",
  "Verification",
] as const;

const DOC_REMINDERS: Record<string, string> = {
  aadhaar: "Use a clear scan showing your full name and number.",
  pan: "PAN must match your bank account name.",
  bank_proof: "Cancelled cheque or first page of the passbook works.",
  certification: "ITI / diploma / PV certificate scans are accepted.",
};

export default function EngineerOnboardingPage() {
  const { updateEngineer, toast } = useStore();
  const scope = useEngineerScope();

  const [submitOpen, setSubmitOpen] = useState(false);

  const engineer = scope?.engineer ?? null;

  const missing = useMemo(() => {
    if (!engineer) return { docs: 0, bank: false };
    return {
      docs: engineer.documents.filter((d) => d.status !== "verified").length,
      bank: !engineer.bankDetailsProvided,
    };
  }, [engineer]);

  if (!engineer) {
    return (
      <div>
        <PageHeader
          title="Onboarding"
          description="Guided verification path: profile, documents, bank details and platform review."
          breadcrumbs={<Breadcrumbs />}
        />
        <Card>
          <EmptyState
            icon={<ListChecks className="h-5 w-5" />}
            title="No engineer account linked"
            description="This demo account does not have an engineer profile linked. Sign in as Vikram (USR-04) to preview the engineer workspace."
          />
        </Card>
      </div>
    );
  }

  const step = Math.max(1, Math.min(5, engineer.onboardingStep || 1));
  const verifiedDocs = engineer.documents.filter((d) => d.status === "verified").length;
  const patch = (p: Parameters<typeof updateEngineer>[1]) => updateEngineer(engineer.id, p);

  const queueDocument = (doc: EngineerDocument) => {
    const documents = engineer.documents.map((d) =>
      d.id === doc.id ? { ...d, status: "pending" as const, uploadedAt: new Date().toISOString() } : d,
    );
    patch({
      documents,
      onboardingStep: Math.max(engineer.onboardingStep, 3),
    });
    toast(`${doc.label} uploaded`, { description: "Document is now pending platform verification (demo)." });
  };

  const addMissingDocument = (label: string) => {
    const documents: EngineerDocument[] = [
      ...engineer.documents,
      {
        id: `DOC-${Date.now().toString(36)}`,
        label,
        type: "other",
        status: "pending",
        uploadedAt: new Date().toISOString(),
      },
    ];
    patch({ documents, onboardingStep: Math.max(engineer.onboardingStep, 3) });
    toast(`${label} added to verification queue`);
  };

  return (
    <div>
      <PageHeader
        title="Onboarding"
        description="Guided verification path: profile, documents, bank details and platform review."
        breadcrumbs={<Breadcrumbs />}
        actions={<VerificationBadge status={engineer.verification} />}
      />

      {/* Progress */}
      <Card className="mb-6">
        <CardHeader
          title="Onboarding progress"
          description={`Step ${step} of 5 — ${STEP_LABELS[step - 1]}`}
        />
        <ProgressBar value={step} max={5} tone={step === 5 ? "success" : "brand"} />
        <ol className="mt-4 grid gap-2 text-[12px] sm:grid-cols-5">
          {STEP_LABELS.map((label, i) => (
            <li
              key={label}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
                i + 1 < step
                  ? "border-success-100 bg-success-50 text-success-700"
                  : i + 1 === step
                    ? "border-brand-100 bg-brand-50 text-brand-700"
                    : "border-line bg-surface text-ink-faint"
              }`}
            >
              {i + 1 < step ? <Check className="h-3.5 w-3.5" aria-hidden /> : <span className="font-semibold">{i + 1}</span>}
              <span className="truncate">{label}</span>
            </li>
          ))}
        </ol>
      </Card>

      {/* Documents */}
      <Card className="mb-6" padded={false}>
        <div className="p-5">
          <CardHeader
            title="Documents & certifications"
            description={`${verifiedDocs} of ${engineer.documents.length} verified · ${missing.docs} pending action`}
          />
        </div>
        <Table>
          <THead
            columns={[
              { label: "Document" },
              { label: "Type" },
              { label: "Status" },
              { label: "Uploaded" },
              { label: "Actions" },
            ]}
          />
          <TBody>
            {engineer.documents.map((d) => (
              <Tr key={d.id}>
                <Td>
                  <p className="text-[13px] font-medium text-ink">{d.label}</p>
                  {DOC_REMINDERS[d.type] && (
                    <p className="mt-0.5 text-[11px] text-ink-faint">{DOC_REMINDERS[d.type]}</p>
                  )}
                </Td>
                <Td><span className="text-[12px] capitalize">{d.type}</span></Td>
                <Td><VerificationBadge status={d.status} /></Td>
                <Td><span className="text-[12px]">{d.uploadedAt ? formatDate(d.uploadedAt) : "—"}</span></Td>
                <Td>
                  {d.status === "verified" ? (
                    <Badge tone="green" dot>Verified</Badge>
                  ) : d.status === "rejected" ? (
                    <div className="flex gap-2">
                      <UploadButton label="Re-upload" onUpload={() => queueDocument(d)} />
                      <Badge tone="red" dot>Rejected</Badge>
                    </div>
                  ) : (
                    <UploadButton label={d.uploadedAt ? "Re-upload" : "Upload"} onUpload={() => queueDocument(d)} />
                  )}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
        {engineer.status === "pending" && (
          <div className="border-t border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] text-ink-muted">
                Missing a document type? Add any extra proof (GST certificate, employer NOC…).
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => addMissingDocument("GST certificate")}>
                  Add GST certificate
                </Button>
                <Button variant="outline" size="sm" onClick={() => addMissingDocument("Additional certification")}>
                  Add certification
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Bank details */}
      <Card className="mb-6">
        <CardHeader
          title="Payout bank details"
          description="Service payments are processed to this account once verification is complete."
          action={<Banknote className="h-4 w-4 text-ink-faint" aria-hidden />}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-alt px-4 py-3">
          <p className="text-[13px] text-ink-soft">
            Status: <strong>{engineer.bankDetailsProvided ? "Submitted & processed (demo)" : "Not provided"}</strong>
          </p>
          <Button
            variant={engineer.bankDetailsProvided ? "outline" : "primary"}
            size="sm"
            disabled={engineer.bankDetailsProvided}
            onClick={() => {
              patch({ bankDetailsProvided: true, onboardingStep: Math.max(engineer.onboardingStep, 4) });
              toast("Bank details marked as submitted", { description: "Demo — no real banking data is captured." });
            }}
          >
            <Banknote className="h-3.5 w-3.5" aria-hidden />
            {engineer.bankDetailsProvided ? "Already submitted" : "Mark bank details submitted"}
          </Button>
        </div>
      </Card>

      {/* Submit for verification */}
      <Card>
        <CardHeader
          title="Submit for platform verification"
          description="Completes your onboarding and sends the profile to the RAYVIQ verification desk."
        />
        {engineer.verification !== "draft" ? (
          <EmptyState
            icon={<BadgeCheck className="h-5 w-5" />}
            title={`Application already ${engineer.verification.replace(/_/g, " ")}`}
            description={
              engineer.verification === "approved"
                ? "Your profile is verified — you can accept assignments."
                : engineer.onboardingNotes
                  ? `Platform note: ${engineer.onboardingNotes}`
                  : "The RAYVIQ verification team will review your documents shortly."
            }
          />
        ) : (
          <div className="space-y-3 text-[13px] text-ink-soft">
            <p>
              {missing.docs === 0 && !missing.bank
                ? "All documents and bank details are in place."
                : "Some items are still incomplete — you can still submit, but approval takes longer."}
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Documents verified: {verifiedDocs}/{engineer.documents.length}</li>
              <li>Bank details: {engineer.bankDetailsProvided ? "submitted" : "missing"}</li>
              <li>Skills & expertise added: {engineer.skills.length + engineer.productExpertise.length} entries</li>
            </ul>
            <div className="flex justify-end">
              <Button onClick={() => setSubmitOpen(true)}>
                <Send className="h-4 w-4" aria-hidden /> Submit profile for verification
              </Button>
            </div>
          </div>
        )}
      </Card>

      {submitOpen && (
        <ConfirmDialog
          open
          onClose={() => setSubmitOpen(false)}
          title="Submit onboarding for verification?"
          message={
            <>
              <p>
                {engineer.name} · {engineer.city}, {engineer.state}
              </p>
              <p className="mt-1 text-ink-muted">
                Status becomes <em>submitted</em> and the RAYVIQ verification desk is notified. Your verification
                history stays visible on this page.
              </p>
            </>
          }
          confirmLabel="Submit application"
          tone="primary"
          requireReason={false}
          onConfirm={(reason) => {
            patch({
              verification: "submitted" as VerificationStatus,
              onboardingStep: 5,
              onboardingNotes: reason || engineer.onboardingNotes,
            });
            toast("Application submitted", { description: "Verification desk notified (demo)." });
            setSubmitOpen(false);
          }}
        />
      )}
    </div>
  );
}

function UploadButton({ onUpload, label = "Upload" }: { onUpload: () => void; label?: string }) {
  return (
    <label>
      <input
        type="file"
        accept="image/*,.pdf"
        className="sr-only"
        onChange={(e) => {
          e.target.value = "";
          onUpload();
        }}
      />
      <span className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:bg-surface-alt">
        <FileText className="h-3.5 w-3.5" aria-hidden /> {label}
      </span>
    </label>
  );
}
