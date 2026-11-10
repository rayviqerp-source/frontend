"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Globe2, Network, Star, Users, Wrench } from "lucide-react";
import { useStore } from "@/lib/store";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { SearchInput, Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { ProgressBar } from "@/components/charts";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { engineerLoadLabel } from "@/lib/selectors";
import { formatDate, initials, scoreColor } from "@/lib/utils";

type Tab = "partners" | "engineers";

export default function AdminNetworkPage() {
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>("partners");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const partnerRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.partners
      .filter((p) => (!q ? true : p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q)))
      .map((p) => {
        const engineers = state.engineers.filter((e) => e.partnerId === p.id);
        const avgRating = engineers.length
          ? Math.round((engineers.reduce((s, e) => s + e.rating, 0) / engineers.length) * 10) / 10
          : 0;
        return { p, engineers, avgRating };
      })
      .filter((r) => !statusFilter || r.p.status === statusFilter)
      .sort((a, b) => b.engineers.length - a.engineers.length);
  }, [state, query, statusFilter]);

  const engineerRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.engineers
      .filter((e) =>
        !q ? true : e.name.toLowerCase().includes(q) || e.city.toLowerCase().includes(q) || e.id.toLowerCase().includes(q),
      )
      .filter((e) => !statusFilter || e.status === statusFilter)
      .map((e) => {
        const partner = state.partners.find((p) => p.id === e.partnerId);
        const completed = state.tickets.filter((t) => t.assignedEngineerId === e.id && (t.status === "completed" || t.status === "closed")).length;
        const score = Math.round(e.rating * 10 * 0.4 + e.reportQualityScore * 0.3 + e.acceptanceRate * 0.3);
        return { e, partner, completed, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [state, query, statusFilter]);

  const totalEngineers = state.engineers.length;
  const verified = state.engineers.filter((e) => e.verification === "approved").length;
  const pending = state.engineers.filter((e) => e.verification === "submitted" || e.verification === "under_verification").length;
  const available = state.engineers.filter((e) => e.availability === "available" && e.status === "active").length;
  const avgRating = totalEngineers ? Math.round((state.engineers.reduce((s, e) => s + e.rating, 0) / totalEngineers) * 10) / 10 : 0;
  const coverage = useMemo(() => {
    const set = new Set(state.engineers.map((e) => e.state).filter(Boolean));
    return set.size;
  }, [state.engineers]);

  return (
    <div>
      <PageHeader
        title="Service network"
        description="Coverage view across OEMs, service partners and engineers working on the platform."
        breadcrumbs={<Breadcrumbs />}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Service partners" value={state.partners.length} tone="brand" icon={<Network className="h-4 w-4" aria-hidden />} hint={`${state.partners.filter((p) => p.status === "active").length} active`} />
        <StatCard label="Engineers on platform" value={totalEngineers} icon={<Wrench className="h-4 w-4" aria-hidden />} hint={`${verified} verified · ${pending} in review`} />
        <StatCard label="Available now" value={available} tone="success" icon={<Users className="h-4 w-4" aria-hidden />} />
        <StatCard label="Avg rating" value={avgRating.toFixed(1)} hint={`Coverage across ${coverage} states`} icon={<Star className="h-4 w-4" aria-hidden />} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 border-b border-line">
          {(
            [
              { key: "partners", label: "Partners" },
              { key: "engineers", label: "Engineers" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                tab === t.key ? "text-brand-700" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
              {tab === t.key && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-600" />}
            </button>
          ))}
        </div>
        <SearchInput value={query} onChange={setQuery} className="w-full sm:w-72" placeholder={tab === "partners" ? "Search partner, city…" : "Search engineer, city, ENG id…"} />
        {tab === "partners" ? (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Partner status"
            className="h-9.5 rounded-lg border border-line-strong bg-surface px-2.5 text-sm text-ink"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        ) : (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Engineer status"
            className="h-9.5 rounded-lg border border-line-strong bg-surface px-2.5 text-sm text-ink"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        )}
      </div>

      {tab === "partners" ? (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          {partnerRows.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<Network className="h-5 w-5" />} title="No partners match" description="Adjust the search or status filter." />
            </div>
          ) : (
            <Table>
              <THead
                columns={[
                  { label: "Partner" },
                  { label: "Location" },
                  { label: "Engineers" },
                  { label: "Verified" },
                  { label: "Avg rating" },
                  { label: "Status" },
                  { label: "Partner since" },
                ]}
              />
              <TBody>
                {partnerRows.map(({ p, engineers, avgRating: r }) => {
                  const verifiedCount = engineers.filter((e) => e.verification === "approved").length;
                  return (
                    <Tr key={p.id}>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-[11px] font-bold text-white">
                            {p.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <p className="text-[13px] font-medium text-ink">{p.name}</p>
                            <p className="text-[11px] text-ink-faint">{p.id}</p>
                          </div>
                        </div>
                      </Td>
                      <Td><span className="text-[12px]">{p.city}, {p.state}</span></Td>
                      <Td><span className="text-[12px]">{engineers.length}</span></Td>
                      <Td><span className="text-[12px]">{verifiedCount}/{engineers.length}</span></Td>
                      <Td><span className={`text-[12px] font-medium ${r ? scoreColor(r * 20) : "text-ink-faint"}`}>{r ? `${r.toFixed(1)}/5` : "—"}</span></Td>
                      <Td><Badge tone={p.status === "active" ? "green" : "gray"} dot>{p.status}</Badge></Td>
                      <Td><span className="text-[12px]">{formatDate(p.since)}</span></Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          {engineerRows.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<Wrench className="h-5 w-5" />} title="No engineers match" description="Adjust the search or status filter." />
            </div>
          ) : (
            <Table>
              <THead
                columns={[
                  { label: "Engineer" },
                  { label: "Partner" },
                  { label: "Base city" },
                  { label: "Verification" },
                  { label: "Load" },
                  { label: "Score" },
                  { label: "Completed" },
                  { label: "Status" },
                ]}
              />
              <TBody>
                {engineerRows.map(({ e, partner, completed, score }) => {
                  const load = engineerLoadLabel(e);
                  return (
                    <Tr key={e.id}>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">
                            {initials(e.name)}
                          </span>
                          <div>
                            <p className="text-[13px] font-medium text-ink">{e.name}</p>
                            <p className="text-[11px] text-ink-faint">{e.id} · {e.experienceYears} yrs</p>
                          </div>
                        </div>
                      </Td>
                      <Td><span className="text-[12px]">{partner?.name ?? "Independent"}</span></Td>
                      <Td><span className="text-[12px]">{e.city}, {e.state}</span></Td>
                      <Td><VerificationBadge status={e.verification} /></Td>
                      <Td>
                        <div className="w-24">
                          <ProgressBar
                            value={e.currentLoad}
                            max={e.maxLoad}
                            tone={load.tone === "green" ? "success" : load.tone === "amber" ? "warning" : "danger"}
                          />
                          <span className="mt-1 block text-[10px] text-ink-faint">{e.currentLoad}/{e.maxLoad} · {load.label}</span>
                        </div>
                      </Td>
                      <Td><span className={`text-[12px] font-medium ${scoreColor(score)}`}>{score}</span></Td>
                      <Td><span className="text-[12px]">{completed}</span></Td>
                      <Td>
                        <Badge tone={e.availability === "available" ? "green" : e.availability === "busy" ? "amber" : "gray"} dot>
                          {e.availability}
                        </Badge>
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader
          title="Coverage snapshot"
          description="Where the network currently has reach, by state and product expertise."
          action={<Globe2 className="h-4 w-4 text-ink-faint" aria-hidden />}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...new Set(state.engineers.map((e) => e.state).filter(Boolean))].map((st) => {
            const inState = state.engineers.filter((e) => e.state === st);
            const verifiedIn = inState.filter((e) => e.verification === "approved").length;
            return (
              <div key={st} className="rounded-lg border border-line bg-surface-alt px-3.5 py-3">
                <p className="text-[13px] font-medium text-ink">{st}</p>
                <p className="mt-0.5 text-[12px] text-ink-muted">
                  {inState.length} engineers · {verifiedIn} verified · cities:{" "}
                  {([...new Set(inState.map((e) => e.city))].sort().join(", ") || "—")}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <p className="mt-4 text-center text-[11px] text-ink-faint">
        Verification actions live on the{" "}
        <Link href="/admin/engineers" className="font-medium text-brand-700 underline hover:text-brand-800">
          Engineer Verification
        </Link>{" "}
        page.
      </p>
    </div>
  );
}
