"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Globe, Palette, ShieldCheck, Sliders, Zap } from "lucide-react";
import { useStore } from "@/lib/store";
import { ROLE_LABELS, DEMO_DISCLAIMER } from "@/lib/constants";
import { can } from "@/lib/permissions";
import { PageHeader, Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch, Select } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";

export default function SettingsPage() {
  const { effectiveRole, currentUser, state, toast } = useStore();
  const [tab, setTab] = useState("preferences");

  const [prefs, setPrefs] = useState({
    emailDigest: true,
    ticketAlerts: true,
    slaAlerts: true,
    assignmentAlerts: true,
    weeklyReport: false,
    sound: true,
    density: "comfortable",
    timezone: state.settings.timezone,
    language: "en",
  });

  const isAdmin = can(effectiveRole, "admin.settings.manage");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Settings"
        description="Personal preferences for your demo session. Platform-wide configuration lives in Platform Settings (admin only)."
        actions={
          isAdmin ? (
            <Link href="/admin/settings">
              <Button variant="outline">
                <Sliders className="h-4 w-4" /> Platform settings
              </Button>
            </Link>
          ) : undefined
        }
      />

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "preferences", label: "Preferences" },
          { key: "notifications", label: "Notifications" },
          { key: "appearance", label: "Appearance" },
          { key: "about", label: "About this demo" },
        ]}
        className="mb-4"
      />

      {tab === "preferences" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Regional" description="Locale and time display for your session." />
            <div className="space-y-4">
              <Select
                label="Language"
                value={prefs.language}
                onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}
                options={[
                  { value: "en", label: "English (India)" },
                  { value: "hi", label: "हिन्दी (coming soon)" },
                ]}
              />
              <Select
                label="Timezone"
                value={prefs.timezone}
                onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
                options={[
                  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
                  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
                  { value: "UTC", label: "UTC" },
                ]}
                hint="Seed data uses IST timestamps"
              />
              <Button
                onClick={() => toast("Preferences saved locally", {
                  description: "A future backend would persist these per user.",
                })}
              >
                Save preferences
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Your session" />
            <div className="space-y-3 text-[13px]">
              <div className="flex items-center justify-between rounded-lg bg-surface-alt/60 px-3.5 py-2.5">
                <span className="text-ink-muted">Signed in as</span>
                <span className="font-medium text-ink">{currentUser?.name}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-alt/60 px-3.5 py-2.5">
                <span className="text-ink-muted">Role</span>
                <Badge tone="blue">{ROLE_LABELS[effectiveRole]}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-alt/60 px-3.5 py-2.5">
                <span className="text-ink-muted">Data persistence</span>
                <Badge tone="cyan">Browser localStorage</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-alt/60 px-3.5 py-2.5">
                <span className="text-ink-muted">State version</span>
                <span className="font-mono text-ink">{state.version}</span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.localStorage.removeItem("rayviq.demo.state");
                  window.location.reload();
                }}
              >
                Reset demo data to seed state
              </Button>
            </div>
          </Card>
        </div>
      )}

      {tab === "notifications" && (
        <Card>
          <CardHeader
            title="Notification preferences"
            description="These toggles affect the demo UI only. Actual delivery requires a connected provider (see Integrations)."
          />
          <div className="divide-y divide-line">
            {[
              { key: "ticketAlerts", label: "Ticket created / status changed", desc: "New tickets, transitions and closures" },
              { key: "assignmentAlerts", label: "Assignment offers", desc: "Offers, acceptances, rejections and fallbacks" },
              { key: "slaAlerts", label: "SLA & escalation alerts", desc: "At-risk and breached SLA warnings" },
              { key: "emailDigest", label: "Daily email digest", desc: "Summary of your open work (simulated)" },
              { key: "weeklyReport", label: "Weekly performance report", desc: "Volume, resolution time and quality metrics" },
              { key: "sound", label: "In-app sound", desc: "Play a tone for critical events" },
            ].map((item) => (
              <div key={item.key} className="py-3.5 first:pt-0 last:pb-0">
                <Switch
                  checked={(prefs as Record<string, boolean | string>)[item.key] as boolean}
                  onChange={(v) => setPrefs({ ...prefs, [item.key]: v })}
                  label={item.label}
                  description={item.desc}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-line bg-surface-alt/60 px-3.5 py-3 text-[13px] text-ink-muted">
            <Bell className="h-4 w-4 shrink-0 text-ink-faint" />
            Channels enabled platform-wide:{" "}
            {Object.entries(state.settings.notificationChannels)
              .filter(([, on]) => on)
              .map(([k]) => (
                <Badge key={k} tone={k === "in_app" ? "blue" : "gray"}>
                  {k.replace(/_/g, " ")}
                </Badge>
              ))}
          </div>
        </Card>
      )}

      {tab === "appearance" && (
        <Card>
          <CardHeader title="Appearance" description="This build ships a single light theme optimised for long support sessions." />
          <div className="space-y-4">
            <Select
              label="Table density"
              value={prefs.density}
              onChange={(e) => setPrefs({ ...prefs, density: e.target.value })}
              options={[
                { value: "comfortable", label: "Comfortable" },
                { value: "compact", label: "Compact (coming soon)" },
              ]}
            />
            <div className="rounded-lg border border-line bg-surface-alt/60 p-4">
              <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
                <Palette className="h-4 w-4 text-ink-faint" /> Theme
              </p>
              <p className="mt-1 text-[13px] leading-6 text-ink-muted">
                Light theme only: white surfaces, deep navy ink, professional blue primary and a
                cyan accent. Dark mode and custom branding are planned after theming requirements
                are confirmed.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-ink-muted">
              <Globe className="h-4 w-4" /> Language: English (India) · RTL support not included
            </div>
          </div>
        </Card>
      )}

      {tab === "about" && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="About RAYVIQ demo" />
            <p className="text-[13px] leading-6 text-ink-muted">{DEMO_DISCLAIMER}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line p-3.5">
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                  <Zap className="h-3.5 w-3.5 text-accent-600" /> Frontend
                </p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  Next.js App Router + TypeScript + Tailwind. All data is mock/seeded and stored in
                  your browser.
                </p>
              </div>
              <div className="rounded-lg border border-line p-3.5">
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                  <ShieldCheck className="h-3.5 w-3.5 text-success-600" /> Security posture
                </p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  No real authentication. RBAC shown here is UI-only; enforce everything on the
                  backend.
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Not connected (by design)" />
            <ul className="space-y-2 text-[13px] leading-6 text-ink-muted">
              {[
                "Real SMS / email / WhatsApp delivery (channels + templates are modelled only)",
                "Payment gateway, invoicing or subscription billing",
                "Warranty decision automation — OEM keeps every decision",
                "Map/geolocation services and file storage",
                "LLM-based assistant (current assistant is rules-based)",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warning-500" />
                  {x}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
