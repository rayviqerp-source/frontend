"use client";

import { useMemo, useState } from "react";
import { Plug, Workflow } from "lucide-react";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, StatCard } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/modal";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { initials } from "@/lib/utils";

const STATE_TONES: Record<string, "green" | "blue" | "red" | "gray" | "amber"> = {
  configured: "green",
  demo: "blue",
  error: "red",
  disabled: "gray",
  not_connected: "gray",
};

const STATE_LABELS: Record<string, string> = {
  configured: "Configured",
  demo: "Demo mode",
  error: "Error",
  disabled: "Disabled",
  not_connected: "Not connected",
};

const CATEGORY_TITLES: Record<string, string> = {
  crm: "CRM sync",
  erp: "ERP / finance",
  warranty: "Warranty registry",
  email: "Email delivery",
  sms: "SMS gateway",
  whatsapp: "WhatsApp Business",
  maps: "Maps & routing",
  ai: "AI services",
  storage: "Document storage",
  payments: "Payments",
};

export default function AdminIntegrationsPage() {
  const { state, toggleIntegration } = useStore();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [category, setCategory] = useState("");

  const categories = useMemo(
    () => [...new Set(state.integrations.map((i) => i.category))],
    [state.integrations],
  );

  const visible = state.integrations
    .filter((i) => !category || i.category === category)
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  const connected = state.integrations.filter((i) => i.state === "demo" || i.state === "configured").length;
  const errored = state.integrations.filter((i) => i.state === "error").length;
  const disabled = state.integrations.filter((i) => i.state === "disabled").length;

  const target = confirmId ? state.integrations.find((i) => i.id === confirmId) ?? null : null;

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Channel and system connections for notifications, data sync and field services. Demo toggles — no external calls are made."
        breadcrumbs={<Breadcrumbs />}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Connected / demo" value={connected} tone="brand" icon={<Plug className="h-4 w-4" aria-hidden />} hint={`${state.integrations.length} total integrations`} />
        <StatCard label="Errors" value={errored} tone={errored ? "danger" : "success"} icon={<Workflow className="h-4 w-4" aria-hidden />} />
        <StatCard label="Disabled" value={disabled} tone={disabled ? "warning" : "default"} />
        <StatCard label="Categories" value={categories.length} />
      </div>

      {/* Category filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("")}
          className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
            category === "" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-ink-soft hover:bg-surface-alt"
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              category === c ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-ink-soft hover:bg-surface-alt"
            }`}
          >
            {CATEGORY_TITLES[c] ?? c}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((i) => (
          <Card key={i.id} className="flex flex-col">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-[11px] font-bold text-brand-700">
                  {initials(i.name)}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{i.name}</h3>
                  <p className="text-[11px] text-ink-faint">{CATEGORY_TITLES[i.category] ?? i.category}</p>
                </div>
              </div>
              <Badge tone={STATE_TONES[i.state] ?? "gray"} dot>{STATE_LABELS[i.state] ?? i.state}</Badge>
            </div>

            <p className="mb-3 flex-1 text-[13px] leading-5 text-ink-muted">{i.description}</p>

            {i.state === "error" && i.errorNote && (
              <p className="mb-3 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-[12px] text-danger-700">
                {i.errorNote}
              </p>
            )}

            <details className="mb-3 text-[12px] text-ink-soft">
              <summary className="cursor-pointer font-medium text-ink-soft">Setup steps</summary>
              <ol className="mt-1.5 ml-4 list-decimal space-y-0.5">
                {i.setupSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </details>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <span className="text-[11px] text-ink-faint">
                {i.lastSyncAt ? `Last sync ${i.lastSyncAt.slice(0, 16).replace("T", " ")}` : "Never synced"}
              </span>
              <Button
                variant={i.state === "disabled" || i.state === "not_connected" ? "primary" : "outline"}
                size="sm"
                onClick={() => setConfirmId(i.id)}
              >
                {i.state === "disabled" || i.state === "not_connected" ? "Connect (demo)" : "Disconnect"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {target && (
        <ConfirmDialog
          open
          onClose={() => setConfirmId(null)}
          title={
            target.state === "disabled" || target.state === "not_connected" || target.state === "error"
              ? `Connect ${target.name}?`
              : `Disconnect ${target.name}?`
          }
          message={
            <>
              <p>{target.description}</p>
              <p className="mt-1 text-ink-muted">
                {target.state === "disabled" || target.state === "not_connected" || target.state === "error"
                  ? "Demo mode connects instantly with simulated data. No credentials are collected."
                  : "Connected customers stop receiving deliveries through this channel until re-connected."}
              </p>
            </>
          }
          confirmLabel={target.state === "disabled" || target.state === "not_connected" || target.state === "error" ? "Connect" : "Disconnect"}
          tone={
            target.state === "disabled" || target.state === "not_connected" || target.state === "error"
              ? "success"
              : "danger"
          }
          onConfirm={() => {
            toggleIntegration(target.id);
            setConfirmId(null);
          }}
        />
      )}
    </div>
  );
}
