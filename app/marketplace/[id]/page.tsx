"use client";

/**
 * Marketplace profile — approved premium UI.
 * See "Agent coordination" in AGENTS.md before editing.
 */

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/constants";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { Modal, } from "@/components/ui/modal";
import { Textarea, Input } from "@/components/ui/form";
import { EmptyState, LoadingScreen } from "@/components/ui/states";
import { ProgressBar } from "@/components/charts";
import { engineerLoadLabel } from "@/lib/selectors";
import { formatDate, scoreColor } from "@/lib/utils";
import { PersonAvatar } from "@/components/marketplace/person-avatar";

const AVATAR_COLORS = ["#2554e0", "#0e7c66", "#b45309", "#7c3aed", "#be123c", "#0369a1", "#a16207"];

function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

export default function MarketplaceProfilePage() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading profile…" />}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const params = useParams<{ id: string }>();
  const { state, ready, toast } = useStore();
  const [requestOpen, setRequestOpen] = useState(false);
  const [issue, setIssue] = useState("");
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);

  const engineer = useMemo(
    () => state.engineers.find((e) => e.id === params.id) ?? null,
    [state.engineers, params.id],
  );

  const partner = engineer ? state.partners.find((p) => p.id === engineer.partnerId) ?? null : null;

  const recentWork = useMemo(() => {
    if (!engineer) return [];
    return state.tickets
      .filter(
        (t) =>
          t.assignedEngineerId === engineer.id &&
          (t.status === "completed" || t.status === "closed"),
      )
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, 5);
  }, [state.tickets, engineer]);

  if (!ready) return <LoadingScreen label="Loading profile…" />;

  if (!engineer || engineer.status === "suspended" || engineer.status === "inactive") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-xl border border-line bg-surface p-4">
          <EmptyState
            icon={<Wrench className="h-5 w-5" />}
            title="Profile not available"
            description="This professional is no longer listed on the marketplace."
            action={
              <Link href="/marketplace">
                <Button variant="outline">Back to marketplace</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const load = engineerLoadLabel(engineer);
  const platformScore = Math.round(
    engineer.rating * 10 * 0.4 + engineer.reportQualityScore * 0.3 + engineer.acceptanceRate * 0.3,
  );

  const submitRequest = () => {
    if (!issue.trim() || !contact.trim()) return;
    setSent(true);
    toast("Service request sent", {
      description: `${engineer.name} has been notified — expect a call within ~${engineer.avgResponseMins} minutes (demo).`,
    });
    setTimeout(() => {
      setRequestOpen(false);
      setSent(false);
      setIssue("");
      setContact("");
    }, 900);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All experts
      </Link>

      {/* -------- Hero profile card -------- */}
      <Card className="mt-4">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <PersonAvatar
              id={engineer.id}
              name={engineer.name}
              className="h-16 w-16 rounded-2xl text-xl"
              backgroundColor={avatarColor(engineer.name)}
            />
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight text-ink">
                {engineer.name}
                {engineer.verification === "approved" && (
                  <BadgeCheck className="h-5 w-5 text-success-600" aria-label="Verified professional" />
                )}
                <VerificationBadge status={engineer.verification} />
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                  {engineer.city}, {engineer.state} · serves {engineer.serviceRadiusKm} km
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-warning-400 text-warning-400" aria-hidden />
                  {engineer.rating > 0 ? `${engineer.rating.toFixed(1)} rating` : "New profile"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                  {partner?.name ?? "Independent professional"}
                </span>
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {engineer.availability === "available" && <Badge tone="green" dot>Available now</Badge>}
                {engineer.availability === "busy" && <Badge tone="amber" dot>On a job</Badge>}
                {engineer.availability === "offline" && <Badge tone="gray" dot>Offline</Badge>}
                <Badge tone="blue">{engineer.experienceYears} yrs experience</Badge>
                <Badge tone="gray">{engineer.languages.join(" · ")}</Badge>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Button onClick={() => setRequestOpen(true)}>
              <Sparkles className="h-4 w-4" aria-hidden /> Request this expert
            </Button>
            <p className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
              <Phone className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
              {engineer.phone}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-5 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Rating"
            value={engineer.rating > 0 ? engineer.rating.toFixed(1) : "—"}
            hint={engineer.completedJobs > 0 ? "from site visits" : "no jobs yet"}
            icon={<Star className="h-4 w-4" aria-hidden />}
          />
          <StatCard label="Jobs done" value={engineer.completedJobs} icon={<CheckCircle2 className="h-4 w-4" aria-hidden />} />
          <StatCard label="Acceptance" value={`${engineer.acceptanceRate}%`} hint={`${engineer.rejectionRate}% rejected`} icon={<ShieldCheck className="h-4 w-4" aria-hidden />} />
          <StatCard label="Response" value={`${engineer.avgResponseMins} min`} hint="avg. first response" icon={<Clock className="h-4 w-4" aria-hidden />} />
          <StatCard label="Report quality" value={<span className={scoreColor(engineer.reportQualityScore)}>{engineer.reportQualityScore}</span>} hint="OEM review score" icon={<Wrench className="h-4 w-4" aria-hidden />} />
          <StatCard label="Platform score" value={<span className={scoreColor(platformScore)}>{platformScore}/100</span>} hint="overall standing" icon={<BadgeCheck className="h-4 w-4" aria-hidden />} />
        </div>
      </Card>

      {/* -------- Body -------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Skills & expertise" description="What this professional handles on site." />
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {engineer.skills.map((s) => (
                  <span key={s} className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-medium text-brand-700">
                    {s}
                  </span>
                ))}
                {engineer.skills.length === 0 && (
                  <span className="text-[13px] text-ink-faint">No skills listed yet.</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {engineer.productExpertise.map((c) => (
                  <span key={c} className="rounded-md border border-line bg-surface-alt px-2 py-1 text-[12px] text-ink-soft">
                    {PRODUCT_CATEGORY_LABELS[c] ?? c}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Certifications"
              description={`Joined ${formatDate(engineer.joinedAt)} · ID ${engineer.id}`}
            />
            <ul className="space-y-1.5">
              {engineer.certifications.map((c) => (
                <li key={c} className="flex items-center gap-2 text-[13px] text-ink-soft">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-600" aria-hidden />
                  {c}
                </li>
              ))}
              {engineer.certifications.length === 0 && (
                <li className="text-[13px] text-ink-faint">No certifications uploaded yet.</li>
              )}
            </ul>
          </Card>

          <Card padded={false}>
            <div className="p-5">
              <CardHeader
                title="Recent service history"
                description="Completed OEM jobs on the RAYVIQ platform."
                action={<CalendarDays className="h-4 w-4 text-ink-faint" aria-hidden />}
              />
            </div>
            {recentWork.length === 0 ? (
              <p className="px-5 pb-5 text-[13px] text-ink-faint">No completed jobs on record yet.</p>
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {recentWork.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {t.issue.category} · {t.location.city}
                      </p>
                      <p className="text-[11px] text-ink-faint">
                        {state.oems.find((o) => o.id === t.oemId)?.name ?? "OEM"} · {t.ref}
                      </p>
                    </div>
                    <span className="text-[12px] text-ink-muted">{formatDate(t.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Live workload" description={`${engineer.currentLoad} of ${engineer.maxLoad} active jobs`} />
            <ProgressBar
              value={engineer.currentLoad}
              max={engineer.maxLoad}
              tone={load.tone === "green" ? "success" : load.tone === "amber" ? "warning" : "danger"}
            />
            <p className="mt-2 text-[12px] text-ink-muted">
              Status: <strong className="text-ink">{load.label}</strong> — lighter workloads get priority in dispatch.
            </p>
          </Card>

          <Card>
            <CardHeader title="Verification" description="Documents reviewed by the RAYVIQ desk." />
            <div className="mb-3 flex items-center justify-between">
              <VerificationBadge status={engineer.verification} />
              <span className="text-[12px] text-ink-muted">
                {engineer.documents.filter((d) => d.status === "verified").length}/{engineer.documents.length} docs
                verified
              </span>
            </div>
            <ul className="space-y-1.5">
              {engineer.documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="truncate text-ink-soft">{d.label}</span>
                  <Badge
                    tone={d.status === "verified" ? "green" : d.status === "rejected" ? "red" : d.status === "pending" ? "amber" : "gray"}
                    dot
                  >
                    {d.status}
                  </Badge>
                </li>
              ))}
              {engineer.documents.length === 0 && (
                <li className="text-[13px] text-ink-faint">No documents on file.</li>
              )}
            </ul>
          </Card>

          {partner && (
            <Card>
              <CardHeader title="Service partner" description={`${partner.city}, ${partner.state} · since ${formatDate(partner.since)}`} />
              <p className="text-[14px] font-medium text-ink">{partner.name}</p>
              <p className="mt-0.5 text-[13px] text-ink-muted">{partner.contactName}</p>
              <div className="mt-2 flex items-center gap-2 text-[13px]">
                <Star className="h-3.5 w-3.5 fill-warning-400 text-warning-400" aria-hidden />
                <span className="font-medium text-ink">{partner.rating.toFixed(1)}</span>
                <span className="text-ink-muted">partner rating</span>
              </div>
            </Card>
          )}

          <Card className="bg-brand-50/60">
            <p className="text-[13px] leading-5 text-ink-soft">
              <strong className="text-ink">Every visit is tracked.</strong> RAYVIQ engineers submit a digital service
              report with findings, parts and photos — reviewed by the OEM before the job is closed.
            </p>
          </Card>
        </div>
      </div>

      {/* -------- Request modal -------- */}
      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title={`Request ${engineer.name}`}
        description={`${engineer.city} · typically responds in ~${engineer.avgResponseMins} minutes`}
        footer={
          <>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button onClick={submitRequest} disabled={sent}>
              <Send className="h-4 w-4" aria-hidden />
              {sent ? "Request sent ✓" : "Send request"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="rounded-lg border border-line bg-surface-alt px-3 py-2.5 text-[13px] text-ink-muted">
            Describe your inverter issue — the expert and a RAYVIQ coordinator will get in touch. This is a demo:
            no real call or booking is placed.
          </p>
          <Input
            label="Your contact"
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Phone or email"
          />
          <Textarea
            label="What needs fixing?"
            required
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            placeholder="e.g. 5kW hybrid inverter shows E014 on the display and stopped exporting since morning."
          />
        </div>
      </Modal>
    </div>
  );
}
