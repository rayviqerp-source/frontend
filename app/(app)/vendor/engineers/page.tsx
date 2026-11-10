"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { usePartnerScope } from "@/components/vendor/scope";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, StatCard } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Drawer } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/states";
import { ProgressBar } from "@/components/charts";
import { SearchInput, Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { engineerLoadLabel } from "@/lib/selectors";
import { formatDate, initials, scoreColor } from "@/lib/utils";
import type { Engineer } from "@/lib/types";

const AVAILABILITY_TONES = {
  available: "green",
  busy: "amber",
  offline: "gray",
} as const;

export default function VendorEngineersPage() {
  const { updateEngineer, toast } = useStore();
  const { partner, engineers, isDemoFallback } = usePartnerScope();

  const [query, setQuery] = useState("");
  const [verification, setVerification] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return engineers
      .filter((e) => {
        if (verification && e.verification !== verification) return false;
        if (!q) return true;
        return (
          e.name.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          e.skills.some((s) => s.toLowerCase().includes(q))
        );
      })
      .map((e) => ({ e, load: engineerLoadLabel(e) }))
      .sort((a, b) => b.e.rating - a.e.rating || b.e.completedJobs - a.e.completedJobs);
  }, [engineers, query, verification]);

  const detail = detailId ? engineers.find((e) => e.id === detailId) ?? null : null;

  if (!partner) {
    return (
      <div>
        <PageHeader title="My engineers" breadcrumbs={<Breadcrumbs />} />
        <Card>
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="No service partner linked"
            description="Sign in as Neha (USR-05 · BrightField) to preview the vendor workspace."
          />
        </Card>
      </div>
    );
  }

  const verified = engineers.filter((e) => e.verification === "approved").length;
  const inReview = engineers.length - verified;
  const available = engineers.filter((e) => e.availability === "available" && e.status === "active").length;

  return (
    <div>
      <PageHeader
        title="My engineers"
        description={`Manage ${partner.name}'s team — verification status, workload and dispatch readiness.`}
        breadcrumbs={<Breadcrumbs />}
        actions={
          <div className="flex items-center gap-2">
            {isDemoFallback && <Badge tone="cyan" dot>Demo scope</Badge>}
            <Link href="/vendor/onboarding">
              <Button>
                <UserPlus className="h-4 w-4" aria-hidden /> Onboard engineer
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Engineers" value={engineers.length} tone="brand" icon={<Users className="h-4 w-4" aria-hidden />} hint={`${verified} verified · ${inReview} in review`} />
        <StatCard label="Verified" value={verified} tone="success" icon={<ShieldCheck className="h-4 w-4" aria-hidden />} />
        <StatCard label="Available now" value={available} icon={<Wrench className="h-4 w-4" aria-hidden />} />
        <StatCard label="Jobs completed" value={engineers.reduce((s, e) => s + e.completedJobs, 0)} icon={<Star className="h-4 w-4" aria-hidden />} hint={`Partner rating ${partner.rating.toFixed(1)}`} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name, city, skill or ENG id…"
          className="w-full sm:w-80"
        />
        <Select
          value={verification}
          onChange={(e) => setVerification(e.target.value)}
          placeholder="All verification states"
          options={[
            { value: "approved", label: "Approved" },
            { value: "submitted", label: "Submitted" },
            { value: "under_verification", label: "Under verification" },
            { value: "more_info_required", label: "More info required" },
            { value: "rejected", label: "Rejected" },
          ]}
          className="w-56"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<UserPlus className="h-5 w-5" />}
              title={engineers.length === 0 ? "No engineers onboarded yet" : "No engineers match"}
              description={
                engineers.length === 0
                  ? "Onboard your first technician — they'll enter the RAYVIQ verification queue and become dispatch-ready once approved."
                  : "Adjust the search or verification filter."
              }
              action={
                engineers.length === 0 ? (
                  <Link href="/vendor/onboarding">
                    <Button size="sm">Onboard engineer</Button>
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <Table>
            <THead
              columns={[
                { label: "Engineer" },
                { label: "Base" },
                { label: "Verification" },
                { label: "Availability" },
                { label: "Load" },
                { label: "Rating" },
                { label: "Jobs" },
                { label: "" },
              ]}
            />
            <TBody>
              {rows.map(({ e, load }) => (
                <Tr key={e.id} onClick={() => setDetailId(e.id)}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700"
                        aria-hidden
                      >
                        {initials(e.name)}
                      </span>
                      <div>
                        <p className="text-[13px] font-medium text-ink">{e.name}</p>
                        <p className="text-[11px] text-ink-faint">{e.id} · {e.experienceYears} yrs</p>
                      </div>
                    </div>
                  </Td>
                  <Td><span className="text-[12px]">{e.city}, {e.state}</span></Td>
                  <Td><VerificationBadge status={e.verification} /></Td>
                  <Td>
                    <Badge tone={AVAILABILITY_TONES[e.availability]} dot>{e.availability}</Badge>
                  </Td>
                  <Td>
                    <div className="w-24">
                      <ProgressBar
                        value={e.currentLoad}
                        max={e.maxLoad}
                        tone={load.tone === "green" ? "success" : load.tone === "amber" ? "warning" : "danger"}
                      />
                      <span className="mt-1 block text-[10px] text-ink-faint">
                        {e.currentLoad}/{e.maxLoad} · {load.label}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className={`text-[12px] font-medium ${e.rating ? scoreColor(e.rating * 20) : "text-ink-faint"}`}>
                      {e.rating > 0 ? `${e.rating.toFixed(1)}★` : "new"}
                    </span>
                  </Td>
                  <Td><span className="text-[12px]">{e.completedJobs}</span></Td>
                  <Td>
                    <span className="text-[12px] font-medium text-brand-700">View →</span>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      {/* Detail drawer */}
      <Drawer
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail?.name ?? ""}
        description={detail ? `${detail.id} · joined ${formatDate(detail.joinedAt)}` : ""}
      >
        {detail && <EngineerDrawerBody engineer={detail} onPatch={(p) => updateEngineer(detail.id, p)} onToast={toast} />}
      </Drawer>
    </div>
  );
}

function EngineerDrawerBody({
  engineer,
  onPatch,
  onToast,
}: {
  engineer: Engineer;
  onPatch: (patch: Partial<Engineer>) => void;
  onToast: (title: string, opts?: { description?: string }) => void;
}) {
  const load = engineerLoadLabel(engineer);
  const partner = usePartnerScope().partner;

  return (
    <div className="space-y-5 text-[13px] leading-6 text-ink-soft">
      <div className="flex flex-wrap gap-2">
        <VerificationBadge status={engineer.verification} />
        <Badge tone={AVAILABILITY_TONES[engineer.availability]} dot>{engineer.availability}</Badge>
        <Badge tone="blue">{engineer.status}</Badge>
      </div>

      <section className="space-y-1">
        <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-ink-faint" aria-hidden />{engineer.phone}</p>
        <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-ink-faint" aria-hidden />{engineer.address || "—"}, {engineer.city} {engineer.pincode}</p>
        <p className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-ink-faint" aria-hidden />{partner?.name ?? "Independent"}</p>
      </section>

      <section>
        <p className="mb-1.5 font-medium text-ink">Performance</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["Rating", engineer.rating > 0 ? `${engineer.rating.toFixed(1)}/5` : "—"],
            ["Jobs done", String(engineer.completedJobs)],
            ["Acceptance", `${engineer.acceptanceRate}%`],
            ["Avg response", `${engineer.avgResponseMins} min`],
            ["Report quality", String(engineer.reportQualityScore)],
            ["Service radius", `${engineer.serviceRadiusKm} km`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-line bg-surface-alt px-2.5 py-2">
              <p className="text-[11px] text-ink-faint">{label}</p>
              <p className="text-[13px] font-medium text-ink">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-1.5 font-medium text-ink">Workload</p>
        <ProgressBar
          value={engineer.currentLoad}
          max={engineer.maxLoad}
          tone={load.tone === "green" ? "success" : load.tone === "amber" ? "warning" : "danger"}
        />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[12px] text-ink-muted">Max concurrent jobs:</span>
          <select
            value={String(engineer.maxLoad)}
            onChange={(ev) => {
              onPatch({ maxLoad: Number(ev.target.value) || 1 });
              onToast("Max load updated");
            }}
            aria-label="Max concurrent jobs"
            className="h-8 rounded-lg border border-line-strong bg-surface px-2 text-[12px] text-ink"
          >
            {[1, 2, 3, 4, 5, 6, 8].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </section>

      <section>
        <p className="mb-1.5 font-medium text-ink">Skills</p>
        <div className="flex flex-wrap gap-1.5">
          {engineer.skills.map((s) => (
            <Badge key={s} tone="blue">{s}</Badge>
          ))}
          {engineer.skills.length === 0 && <span className="text-ink-faint">None listed.</span>}
        </div>
      </section>

      <section>
        <p className="mb-1.5 font-medium text-ink">Documents</p>
        <ul className="space-y-1">
          {engineer.documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 rounded-md bg-surface-alt px-2.5 py-1.5 text-[12px]">
              <span className="truncate">{d.label}</span>
              <Badge tone={d.status === "verified" ? "green" : d.status === "rejected" ? "red" : d.status === "pending" ? "amber" : "gray"} dot>
                {d.status}
              </Badge>
            </li>
          ))}
          {engineer.documents.length === 0 && <li className="text-ink-faint">No documents uploaded.</li>}
        </ul>
      </section>

      <div className="flex justify-end border-t border-line pt-3">
        <Link href={`/marketplace/${engineer.id}`}>
          <Button variant="outline" size="sm">View public profile</Button>
        </Link>
      </div>
    </div>
  );
}
