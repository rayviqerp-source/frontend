"use client";

import { useState } from "react";
import { Bell, Building2, Save, Target, Workflow } from "lucide-react";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Input, Select, Switch } from "@/components/ui/form";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { NOTIFICATION_CHANNELS } from "@/lib/constants";
import type { PlatformSettings } from "@/lib/types";

export default function AdminSettingsPage() {
  const { state, updateSettings } = useStore();

  const [draft, setDraft] = useState<PlatformSettings>(state.settings);
  const [dirty, setDirty] = useState(false);
  /* Track the store snapshot our draft was seeded from so external updates
     (e.g. a parallel save in another session) reset the editor. Render-phase
     adjustment is the React-recommended pattern for derived state. */
  const [syncedFrom, setSyncedFrom] = useState<PlatformSettings>(state.settings);

  if (state.settings !== syncedFrom) {
    setSyncedFrom(state.settings);
    setDraft(state.settings);
    setDirty(false);
  }

  const edit = (partial: Partial<PlatformSettings>) => {
    setDraft((d) => ({ ...d, ...partial }));
    setDirty(true);
  };

  const saveOrg = () => {
    updateSettings({
      organisationName: draft.organisationName,
      supportEmail: draft.supportEmail,
      timezone: draft.timezone,
    });
  };

  const saveSla = () => {
    updateSettings({ slaTargets: draft.slaTargets });
  };

  const saveAssignment = () => {
    updateSettings({ assignment: draft.assignment });
  };

  const toggleChannel = (key: keyof PlatformSettings["notificationChannels"]) => {
    const next = { ...draft.notificationChannels, [key]: !draft.notificationChannels[key] };
    edit({ notificationChannels: next });
  };

  const dirtyChannels =
    JSON.stringify(state.settings.notificationChannels) !== JSON.stringify(draft.notificationChannels);

  return (
    <div>
      <PageHeader
        title="Platform settings"
        description="Global configuration for RAYVIQ operations — SLA targets, dispatch policy and notification channels."
        breadcrumbs={<Breadcrumbs />}
        actions={dirty && <Badge tone="amber" dot>Unsaved changes</Badge>}
      />

      {/* Organisation */}
      <Card className="mb-6">
        <CardHeader
          title="Organisation profile"
          description="Platform-branded settings applied across notifications and portals."
          action={<Building2 className="h-4 w-4 text-ink-faint" aria-hidden />}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Organisation name"
            value={draft.organisationName}
            onChange={(e) => edit({ organisationName: e.target.value })}
          />
          <Input
            label="Support email"
            type="email"
            value={draft.supportEmail}
            onChange={(e) => edit({ supportEmail: e.target.value })}
          />
          <Select
            label="Timezone"
            value={draft.timezone}
            onChange={(e) => edit({ timezone: e.target.value })}
            options={[
              { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
              { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
              { value: "UTC", label: "UTC" },
            ]}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={saveOrg} disabled={!dirty}>
            <Save className="h-4 w-4" aria-hidden /> Save
          </Button>
        </div>
      </Card>

      {/* SLA targets */}
      <Card className="mb-6" padded={false}>
        <div className="p-5">
          <CardHeader
            title="SLA targets"
            description="Clocks start when a ticket is created (per priority)."
            action={<Target className="h-4 w-4 text-ink-faint" aria-hidden />}
          />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-line bg-surface-alt/70 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5">Priority</th>
              <th className="px-4 py-2.5">First response (min)</th>
              <th className="px-4 py-2.5">Assignment (min)</th>
              <th className="px-4 py-2.5">Visit (hours)</th>
              <th className="px-4 py-2.5">Resolution (hours)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {draft.slaTargets.map((t, idx) => (
              <tr key={t.priority}>
                <td className="px-4 py-2.5 text-[13px] font-medium capitalize text-ink">{t.priority}</td>
                {(
                  [
                    ["responseMins", t.responseMins],
                    ["assignmentMins", t.assignmentMins],
                    ["visitHours", t.visitHours],
                    ["resolutionHours", t.resolutionHours],
                  ] as const
                ).map(([key, value]) => (
                  <td key={key} className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      value={String(value)}
                      aria-label={`${t.priority} ${key}`}
                      onChange={(e) => {
                        const slaTargets = draft.slaTargets.map((x, i) =>
                          i === idx ? { ...x, [key]: Number(e.target.value) || 0 } : x,
                        );
                        edit({ slaTargets });
                      }}
                      className="h-8.5 w-24 rounded-lg border border-line-strong bg-surface px-2 text-sm text-ink focus:border-brand-400 focus:outline-none"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end border-t border-line p-4">
          <Button onClick={saveSla} disabled={!dirty}>
            <Save className="h-4 w-4" aria-hidden /> Save SLA targets
          </Button>
        </div>
      </Card>

      {/* Assignment policy */}
      <Card className="mb-6">
        <CardHeader
          title="Dispatch & offer policy"
          description="How the platform routes tickets into the engineer network."
          action={<Workflow className="h-4 w-4 text-ink-faint" aria-hidden />}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Assignment strategy"
            value={draft.assignment.strategy}
            onChange={(e) =>
              edit({ assignment: { ...draft.assignment, strategy: e.target.value as PlatformSettings["assignment"]["strategy"] } })
            }
            options={[
              { value: "manual", label: "Manual — OEM picks the engineer" },
              { value: "recommended", label: "Recommended — engine suggests top picks" },
              { value: "auto_offer", label: "Auto-offer — dispatch instantly" },
            ]}
          />
          <Input
            label="Offer timeout (min)"
            type="number"
            min={5}
            value={String(draft.assignment.offerTimeoutMins)}
            onChange={(e) =>
              edit({ assignment: { ...draft.assignment, offerTimeoutMins: Number(e.target.value) || 0 } })
            }
            hint="Deadline for engineers to respond"
          />
          <Input
            label="Max concurrent offers"
            type="number"
            min={1}
            value={String(draft.assignment.maxConcurrentOffers)}
            onChange={(e) =>
              edit({ assignment: { ...draft.assignment, maxConcurrentOffers: Number(e.target.value) || 0 } })
            }
          />
          <div className="pt-6 sm:pt-7">
            <Switch
              checked={draft.assignment.fallbackToQueue}
              onChange={(v) => edit({ assignment: { ...draft.assignment, fallbackToQueue: v } })}
              label="Fallback to queue"
              description="Rejected / expired offers return to the assignment queue automatically."
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={saveAssignment} disabled={!dirty}>
            <Save className="h-4 w-4" aria-hidden /> Save policy
          </Button>
        </div>
      </Card>

      {/* Notification channels */}
      <Card className="mb-6">
        <CardHeader
          title="Notification channels"
          description="Deliveries fall back to in-app-only when a channel is disabled."
          action={<Bell className="h-4 w-4 text-ink-faint" aria-hidden />}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {NOTIFICATION_CHANNELS.map((c) => (
            <div key={c.key} className="rounded-lg border border-line bg-surface-alt px-4 py-3">
              <Switch
                checked={draft.notificationChannels[c.key]}
                onChange={() => toggleChannel(c.key)}
                label={c.label}
                description={
                  c.key === "in_app"
                    ? "Always available"
                    : draft.notificationChannels[c.key]
                      ? "Messages will be queued for this channel"
                      : "Channel currently disabled"
                }
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end gap-3">
          {dirtyChannels && (
            <p className="text-[12px] text-ink-faint">Channel changes apply immediately after save.</p>
          )}
          <Button
            disabled={!dirtyChannels}
            onClick={() => {
              updateSettings({ notificationChannels: draft.notificationChannels });
            }}
          >
            <Save className="h-4 w-4" aria-hidden /> Save channels
          </Button>
        </div>
      </Card>

      {/* Reference lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card padded={false}>
          <div className="p-5">
            <CardHeader title="Ticket categories" description={`${state.settings.issueCategories.length} issue categories in the intake form.`} />
          </div>
          <ul className="flex flex-wrap gap-1.5 px-5 pb-5">
            {state.settings.issueCategories.map((c) => (
              <li key={c}><Badge tone="blue">{c}</Badge></li>
            ))}
          </ul>
        </Card>
        <Card padded={false}>
          <div className="p-5">
            <CardHeader title="Escalation rules" description="Automatic routing of aged / breached tickets." />
          </div>
          <TableListEscalations names={state.settings.escalationRules.map((r) => `${r.name} · L${r.level} · trigger: ${r.trigger}`)} />
        </Card>
      </div>

      <p className="mt-6 text-center text-[11px] text-ink-faint">
        Audit trail: every settings save is recorded with actor and diff summary.
      </p>
    </div>
  );
}

function TableListEscalations({ names }: { names: string[] }) {
  const { state } = useStore();
  return (
    <ul className="space-y-0 divide-y divide-line">
      {names.map((n, i) => (
        <li key={n} className="flex items-center justify-between px-5 py-2.5 text-[13px] text-ink-soft">
          <span>{n}</span>
          <Badge tone={state.settings.escalationRules[i].enabled ? "green" : "gray"} dot>
            {state.settings.escalationRules[i].enabled ? "enabled" : "paused"}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
