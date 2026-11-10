"use client";

import { useMemo, useState } from "react";
import { Download, History, RotateCcw, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, StatCard } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Pagination, SearchInput, Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { downloadCsv, formatDateTime, relativeTime } from "@/lib/utils";
import type { AuditLog, Role } from "@/lib/types";

const SEVERITY_TONES: Record<AuditLog["severity"], "gray" | "amber" | "red"> = {
  info: "gray",
  warning: "amber",
  critical: "red",
};

type SortKey = "at" | "action" | "actor" | "target" | "severity";

export default function AdminAuditPage() {
  const { state } = useStore();

  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [role, setRole] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "at", dir: "desc" });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const base = state.auditLogs;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = base.filter((l) => {
      if (severity && l.severity !== severity) return false;
      if (role && l.actorRole !== role) return false;
      if (!q) return true;
      return (
        l.action.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q) ||
        l.actor.toLowerCase().includes(q) ||
        (l.detail ?? "").toLowerCase().includes(q) ||
        (l.targetRef ?? "").toLowerCase().includes(q)
      );
    });
    if (sort) {
      out = [...out].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        const cmp = String(av ?? "").localeCompare(String(bv ?? ""));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [base, query, severity, role, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const criticals = base.filter((l) => l.severity === "critical").length;
  const warnings = base.filter((l) => l.severity === "warning").length;
  const today = base.filter((l) => new Date(l.at).toDateString() === new Date().toDateString()).length;

  const roles = useMemo(
    () => [...new Set(base.map((l) => l.actorRole))].filter((r): r is Role => r !== "system"),
    [base],
  );

  const reset = () => {
    setQuery("");
    setSeverity("");
    setRole("");
    setSort({ key: "at", dir: "desc" });
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Audit logs"
        description="Every privileged action across the platform — who did what, to which record, and when."
        breadcrumbs={<Breadcrumbs />}
        actions={
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                "rayviq-audit-logs",
                rows.map((l) => ({
                  at: l.at,
                  actor: l.actor,
                  actorRole: l.actorRole,
                  action: l.action,
                  target: l.target,
                  targetRef: l.targetRef ?? "",
                  severity: l.severity,
                  detail: l.detail ?? "",
                })),
              )
            }
          >
            <Download className="h-4 w-4" aria-hidden /> Export CSV
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total entries" value={base.length} tone="brand" icon={<History className="h-4 w-4" aria-hidden />} />
        <StatCard label="Today" value={today} icon={<History className="h-4 w-4" aria-hidden />} />
        <StatCard label="Warnings" value={warnings} tone={warnings ? "warning" : "default"} />
        <StatCard label="Critical" value={criticals} tone={criticals ? "danger" : "success"} icon={<ShieldCheck className="h-4 w-4" aria-hidden />} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <SearchInput
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPage(1);
          }}
          placeholder="Search action, actor, target, reference…"
          className="w-full sm:w-80"
        />
        <Select
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value);
            setPage(1);
          }}
          placeholder="All severities"
          options={[
            { value: "info", label: "Info" },
            { value: "warning", label: "Warning" },
            { value: "critical", label: "Critical" },
          ]}
          className="w-40"
        />
        <Select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          placeholder="All actor roles"
          options={roles.map((r) => ({ value: r, label: ROLE_LABELS[r] ?? r }))}
          className="w-56"
        />
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {paged.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<History className="h-5 w-5" />}
              title="No log entries match"
              description="Adjust the filters — the demo seed populates a rich audit history from day one."
            />
          </div>
        ) : (
          <>
            <Table>
              <THead
                columns={[
                  { label: "Timestamp" },
                  { label: "Actor" },
                  { label: "Action" },
                  { label: "Target" },
                  { label: "Severity" },
                  { label: "Detail" },
                ]}
              />
              <TBody>
                {paged.map((l) => (
                  <Tr key={l.id}>
                    <Td>
                      <span className="text-[12px]">{formatDateTime(l.at)}</span>
                      <span className="mt-0.5 block text-[10px] text-ink-faint">{relativeTime(l.at)}</span>
                    </Td>
                    <Td>
                      <p className="text-[13px] font-medium text-ink">{l.actor}</p>
                      <p className="text-[11px] text-ink-faint">
                        {l.actorRole === "system" ? "System" : ROLE_LABELS[l.actorRole as Role] ?? l.actorRole.replace(/_/g, " ")}
                      </p>
                    </Td>
                    <Td>
                      <span className="text-[13px] text-ink">{l.action}</span>
                      {l.targetRef && (
                        <span className="mt-0.5 block font-mono text-[10px] text-ink-faint">{l.targetRef}</span>
                      )}
                    </Td>
                    <Td><span className="text-[12px]">{l.target}</span></Td>
                    <Td>
                      <Badge tone={SEVERITY_TONES[l.severity]} dot>{l.severity}</Badge>
                    </Td>
                    <Td className="max-w-80">
                      {l.detail ? (
                        <span className="line-clamp-2 text-[12px]">{l.detail}</span>
                      ) : (
                        <span className="text-[11px] text-ink-faint">—</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={rows.length}
              onPage={setPage}
              pageSizeLabel={`${PAGE_SIZE} per page`}
            />
          </>
        )}
      </div>

      <Card className="mt-6">
        <p className="text-[13px] text-ink-muted">
          <strong className="text-ink">Note:</strong> the audit store is purposefully read-only in this demo — entries
          are appended by the platform actions across tickets, assignments, reports, onboarding and settings.
        </p>
      </Card>
    </div>
  );
}
