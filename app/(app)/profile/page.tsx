"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Calendar,
  KeyRound,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/constants";
import { initials, formatDate } from "@/lib/utils";
import { PageHeader, Card, CardHeader, StatCard } from "@/components/ui/card";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { ProgressBar } from "@/components/charts";

export default function ProfilePage() {
  const { currentUser, state, effectiveRole, updateEngineer, toast } = useStore();
  const [tab, setTab] = useState("profile");

  const engineer = useMemo(
    () => state.engineers.find((e) => e.id === currentUser?.engineerId),
    [state.engineers, currentUser?.engineerId],
  );

  const [form, setForm] = useState({
    name: currentUser?.name ?? "",
    email: currentUser?.email ?? "",
    phone: currentUser?.phone ?? "",
    city: engineer?.city ?? "",
    address: engineer?.address ?? "",
    radius: String(engineer?.serviceRadiusKm ?? 50),
  });

  if (!currentUser) return null;

  const myTickets = state.tickets.filter((t) => t.assignedEngineerId === engineer?.id);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Profile"
        description="Your account, role and — for engineers — verification and performance details."
      />

      {/* Identity card */}
      <Card className="mb-4 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-semibold text-white"
            style={{ backgroundColor: currentUser.avatarColor }}
          >
            {initials(currentUser.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{currentUser.name}</h2>
              <Badge tone="blue">{ROLE_LABELS[effectiveRole]}</Badge>
              {engineer && <VerificationBadge status={engineer.verification} />}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {currentUser.email}
              </span>
              {currentUser.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {currentUser.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Joined {formatDate(currentUser.createdAt)}
              </span>
              {currentUser.designation && (
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="h-3.5 w-3.5" /> {currentUser.designation}
                </span>
              )}
            </div>
          </div>
          <div className="text-right text-[13px] text-ink-muted">
            <p>UserID</p>
            <p className="font-mono text-ink">{currentUser.id}</p>
            {currentUser.oemId && <p className="mt-1 font-mono text-ink">{currentUser.oemId}</p>}
            {currentUser.partnerId && <p className="font-mono text-ink">{currentUser.partnerId}</p>}
          </div>
        </div>
      </Card>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "profile", label: "Account" },
          { key: "security", label: "Security" },
          ...(engineer ? [{ key: "performance", label: "Performance" }] : []),
        ]}
        className="mb-4"
      />

      {tab === "profile" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Personal details" description="Editable demo profile fields." />
            <div className="space-y-4">
              <Input
                label="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              {engineer && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="City"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                    <Input
                      label="Service radius (km)"
                      type="number"
                      value={form.radius}
                      onChange={(e) => setForm({ ...form, radius: e.target.value })}
                    />
                  </div>
                  <Input
                    label="Address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </>
              )}
              <Button
                onClick={() => {
                  if (engineer) {
                    updateEngineer(engineer.id, {
                      city: form.city || engineer.city,
                      address: form.address || engineer.address,
                      serviceRadiusKm: Number(form.radius) || engineer.serviceRadiusKm,
                    });
                  }
                  toast("Profile saved (local demo only)");
                }}
              >
                <Save className="h-4 w-4" /> Save changes
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Role & access" description="Effective permissions for your session." />
            <div className="space-y-3 text-[13px]">
              <div className="flex items-center justify-between rounded-lg bg-surface-alt/60 px-3.5 py-2.5">
                <span className="text-ink-muted">Effective role</span>
                <Badge tone="blue">{ROLE_LABELS[effectiveRole]}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-alt/60 px-3.5 py-2.5">
                <span className="text-ink-muted">Portal</span>
                <span className="font-medium text-ink">
                  {effectiveRole.startsWith("oem")
                    ? "OEM Portal"
                    : effectiveRole === "engineer" || effectiveRole === "partner_manager"
                      ? "Engineer Portal"
                      : "Admin Portal"}
                </span>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-warning-100 bg-warning-50 px-3.5 py-3 text-[12px] leading-5 text-warning-700">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                Role checks in this build are for demonstration. The production backend must
                authorise every request server-side.
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === "security" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Change password" />
            <div className="space-y-4">
              <Input label="Current password" type="password" defaultValue="demo1234" />
              <Input label="New password" type="password" hint="Min 8 characters" />
              <Input label="Confirm new password" type="password" />
              <Button onClick={() => toast("Password change simulated", { description: "No real credential is stored." })}>
                <KeyRound className="h-4 w-4" /> Update password
              </Button>
            </div>
          </Card>
          <Card>
            <CardHeader title="Sessions & alerts" />
            <div className="space-y-3 text-[13px]">
              <div className="flex items-center justify-between rounded-lg border border-line px-3.5 py-3">
                <span>
                  <span className="block font-medium text-ink">Current browser</span>
                  <span className="text-ink-muted">Session active · localStorage demo</span>
                </span>
                <Badge tone="green" dot>
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-line px-3.5 py-3">
                <span>
                  <span className="block font-medium text-ink">Login alerts</span>
                  <span className="text-ink-muted">Email on new device (requires backend)</span>
                </span>
                <Badge tone="gray">Off</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-line px-3.5 py-3">
                <span>
                  <span className="block font-medium text-ink">Two-factor auth</span>
                  <span className="text-ink-muted">OTP via SMS (provider not connected)</span>
                </span>
                <Badge tone="amber">Simulated</Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === "performance" && engineer && (
        <div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              label="Rating"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-5 w-5 fill-warning-400 text-warning-400" />
                  {engineer.rating.toFixed(1)}
                </span>
              }
              hint={`${engineer.completedJobs} completed jobs`}
            />
            <StatCard
              label="Acceptance rate"
              value={`${Math.round(engineer.acceptanceRate * 100)}%`}
              hint={`Response avg ${engineer.avgResponseMins}m`}
            />
            <StatCard
              label="Report quality"
              value={engineer.reportQualityScore}
              hint="OEM review feedback score /100"
            />
            <StatCard
              label="Current load"
              value={`${engineer.currentLoad}/${engineer.maxLoad}`}
              hint={`${myTickets.length} tickets historically`}
              tone={engineer.currentLoad / engineer.maxLoad > 0.85 ? "warning" : "success"}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Skills & expertise" />
              <div className="mb-4">
                <p className="mb-2 text-[13px] font-medium text-ink">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {engineer.skills.map((s) => (
                    <Badge key={s} tone="blue">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <p className="mb-2 text-[13px] font-medium text-ink">Product expertise</p>
                <div className="flex flex-wrap gap-1.5">
                  {engineer.productExpertise.map((s) => (
                    <Badge key={s} tone="cyan">
                      {s.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[13px] font-medium text-ink">Certifications</p>
                <div className="flex flex-wrap gap-1.5">
                  {engineer.certifications.map((s) => (
                    <Badge key={s} tone="violet">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Assignment quality" />
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <span className="text-ink-muted">Acceptance rate</span>
                    <span className="font-medium text-ink">
                      {Math.round(engineer.acceptanceRate * 100)}%
                    </span>
                  </div>
                  <ProgressBar value={engineer.acceptanceRate * 100} tone="success" />
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <span className="text-ink-muted">Rejection rate</span>
                    <span className="font-medium text-ink">
                      {Math.round(engineer.rejectionRate * 100)}%
                    </span>
                  </div>
                  <ProgressBar value={engineer.rejectionRate * 100} tone="danger" />
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <span className="text-ink-muted">Report quality</span>
                    <span className="font-medium text-ink">{engineer.reportQualityScore}/100</span>
                  </div>
                  <ProgressBar value={engineer.reportQualityScore} tone="brand" />
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <span className="text-ink-muted">Workload</span>
                    <span className="font-medium text-ink">
                      {engineer.currentLoad}/{engineer.maxLoad}
                    </span>
                  </div>
                  <ProgressBar
                    value={(engineer.currentLoad / engineer.maxLoad) * 100}
                    tone={engineer.currentLoad / engineer.maxLoad > 0.85 ? "warning" : "brand"}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
