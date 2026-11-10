"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import type { Ticket } from "@/lib/types";
import type { ServiceReportBody } from "@/lib/store";

/** Shared submit / re-submit form for the technical service report. */
export function ReportModal({
  ticket,
  reviewRemark,
  onClose,
  onSubmit,
}: {
  ticket: Ticket;
  reviewRemark?: string;
  onClose: () => void;
  onSubmit: (body: ServiceReportBody) => void;
}) {
  const [findings, setFindings] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [work, setWork] = useState("");
  const [parts, setParts] = useState("");
  const [codes, setCodes] = useState(ticket.issue.errorCode ?? "");
  const [recs, setRecs] = useState("");
  const [safety, setSafety] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [ack, setAck] = useState(false);
  const [evidenceNames, setEvidenceNames] = useState<string[]>([]);
  const [error, setError] = useState("");

  const submit = () => {
    if (!findings.trim() || !diagnosis.trim() || !work.trim()) {
      setError("Findings, diagnosis and work performed are mandatory.");
      return;
    }
    if (!ack) {
      setError("Customer acknowledgement is required before submission.");
      return;
    }
    onSubmit({
      inspectionFindings: findings.trim(),
      diagnosis: diagnosis.trim(),
      workPerformed: work.trim(),
      partsUsed: parts.trim(),
      errorCodes: codes.trim(),
      recommendations: recs.trim(),
      followUpRequired: followUp,
      safetyObservations: safety.trim() || undefined,
      customerAcknowledged: ack,
      evidenceNames,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Technical service report"
      description={`${ticket.ref} · ${ticket.issue.category} · ${ticket.location.city}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Submit for OEM review</Button>
        </>
      }
    >
      <div className="space-y-4">
        {reviewRemark && (
          <div className="rounded-lg border border-warning-100 bg-warning-50 p-3 text-[13px] text-warning-700">
            <p className="font-medium">OEM remark from previous review</p>
            <p className="mt-1">{reviewRemark}</p>
          </div>
        )}
        <Textarea
          label="Inspection findings"
          required
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          placeholder="What did you observe on site? Fault codes, readings, wiring condition…"
        />
        <Textarea
          label="Diagnosis"
          required
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="Root cause based on the findings."
        />
        <Textarea
          label="Work performed"
          required
          value={work}
          onChange={(e) => setWork(e.target.value)}
          placeholder="Repairs, replacements, tests, restoration steps…"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Parts used"
            hint="Comma separated"
            value={parts}
            onChange={(e) => setParts(e.target.value)}
            placeholder="15A DC fuse ×2, fuse holder ×2"
          />
          <Input
            label="Error codes"
            hint="Optional"
            value={codes}
            onChange={(e) => setCodes(e.target.value)}
            placeholder="E014"
          />
        </div>
        <Textarea
          label="Recommendations"
          value={recs}
          onChange={(e) => setRecs(e.target.value)}
          placeholder="Follow-up repairs, warranty claims, monitoring suggestions…"
        />
        <Input
          label="Safety observations"
          hint="Optional"
          value={safety}
          onChange={(e) => setSafety(e.target.value)}
          placeholder="Anything to flag (PPE, hazard, non-compliance)…"
        />
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink">Evidence attachments</p>
          <FileUploadRow
            onFiles={(names) => setEvidenceNames((prev) => [...prev, ...names.filter((n) => !prev.includes(n))])}
          />
          {evidenceNames.length > 0 && (
            <ul className="mt-2 space-y-1">
              {evidenceNames.map((n) => (
                <li key={n} className="flex items-center justify-between rounded-md bg-surface-alt px-2.5 py-1.5 text-[12px] text-ink-soft">
                  <span className="truncate">{n}</span>
                  <button
                    type="button"
                    onClick={() => setEvidenceNames((prev) => prev.filter((x) => x !== n))}
                    className="text-[12px] font-medium text-danger-600 hover:text-danger-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Checkbox checked={followUp} onChange={setFollowUp} label="Follow-up visit required" />
        <Checkbox
          checked={ack}
          onChange={setAck}
          label={`Customer (${ticket.contact.name}) has acknowledged the work performed on site.`}
        />
        {error && <p className="text-xs text-danger-600">{error}</p>}
      </div>
    </Modal>
  );
}

/** Selects files by name only — no uploads happen in this demo. */
export function FileUploadRow({ onFiles }: { onFiles: (names: string[]) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-line-strong bg-surface-alt px-4 py-3 text-[13px] transition-colors hover:border-brand-400">
      <span className="text-ink-faint">Photos / PDFs — stored in this demo only</span>
      <span className="font-medium text-brand-700">Choose files</span>
      <input
        type="file"
        multiple
        accept="image/*,.pdf"
        className="sr-only"
        onChange={(e) => {
          const names = Array.from(e.target.files ?? []).map((f) => f.name);
          if (names.length) onFiles(names);
          e.target.value = "";
        }}
      />
    </label>
  );
}
