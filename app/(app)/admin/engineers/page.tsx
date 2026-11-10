"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Download, SearchCheck, ShieldCheck, ShieldX, Wrench } from "lucide-react";
import { useStore } from "@/lib/store";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Pagination, SearchInput, Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { downloadCsv } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function AdminEngineersPage() {
  const router = useRouter();
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const [verification, setVerification] = useState("");
  const [partner, setPartner] = useState("");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.engineers
      .filter((e) => {
        if (verification && e.verification !== verification) return false;
        if (partner && e.partnerId !== partner) return false;
        if (!q) return true;
        return (
          e.name.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q) ||
          e.state.toLowerCase().includes(q) ||
          e.skills.some((s) => s.toLowerCase().includes(q)) ||
          e.certifications.some((s) => s.toLowerCase().includes(q))
        );
      })
      .map((e) => ({
        e,
        partnerName: state.partners.find((p) => p.id === e.partnerId)?.name ?? "Independent",
        assignments: state.tickets.filter((t) => t.assignedEngineerId === e.id).length,
        documentsPending: e.documents.filter((d) => d.status === "pending" || d.status === "missing" || d.status === "rejected").length,
      }))
      .sort((a, b) => {
        const rank = (v: string) => (v === "submitted" ? 0 : v === "under_verification" ? 1 : v === "more_info_required" ? 2 : v === "approved" ? 3 : 4);
        return rank(a.e.verification) - rank(b.e.verification) || a.e.name.localeCompare(b.e.name);
      });
  }, [state.engineers, state.partners, state.tickets, query, verification, partner]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pending = state.engineers.filter((e) => e.verification === "submitted" || e.verification === "under_verification" || e.verification === "more_info_required").length;
  const approved = state.engineers.filter((e) => e.verification === "approved").length;
  const rejected = state.engineers.filter((e) => e.verification === "rejected").length;

  return (
    <div>
      <PageHeader
        title="Engineer verification"
        description="Approve the service network's identity, qualification and bank documents. Approval unlocks offers; it never grants OEM warranty authority."
        breadcrumbs={<Breadcrumbs />}
        actions={
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                "rayviq-engineer-verification",
                rows.map((r) => ({
                  id: r.e.id,
                  name: r.e.name,
                  partner: r.partnerName,
                  city: r.e.city,
                  state: r.e.state,
                  verification: r.e.verification,
                  status: r.e.status,
                  certifications: r.e.certifications.join(" | "),
                  documentsPending: r.documentsPending,
                  rating: r.e.rating,
                  assignments: r.assignments,
                })),
              )
            }
          >
            <Download className="h-4 w-4" aria-hidden /> Export
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Engineer network" value={state.engineers.length} hint={`${state.partners.filter((p) => p.status === "active").length} active partners`} icon={<Wrench className="h-4 w-4" />} tone="brand" />
        <StatCard label="Awaiting verification" value={pending} hint="Needs a RAYVIQ decision" icon={<SearchCheck className="h-4 w-4" />} tone={pending ? "warning" : "success"} />
        <StatCard label="Approved" value={approved} hint={`${Math.round((approved / Math.max(state.engineers.length, 1)) * 100)}% of network`} icon={<BadgeCheck className="h-4 w-4" />} tone="success" />
        <StatCard label="Rejected / suspended" value={rejected + state.engineers.filter((e) => e.status === "suspended").length} hint={`${rejected} rejected verification`} icon={<ShieldX className="h-4 w-4" />} tone={rejected ? "danger" : "default"} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search name, city, skill or certification…" className="w-full sm:w-80" />
        <Select
          value={verification}
          onChange={(e) => { setVerification(e.target.value); setPage(1); }}
          placeholder="All verification states"
          options={[
            { value: "submitted", label: "Submitted" },
            { value: "under_verification", label: "Under verification" },
            { value: "more_info_required", label: "More info required" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "draft", label: "Draft" },
          ]}
          className="w-52"
        />
        <Select
          value={partner}
          onChange={(e) => { setPartner(e.target.value); setPage(1); }}
          placeholder="All partners"
          options={state.partners.map((p) => ({ value: p.id, label: p.name }))}
          className="w-52"
        />
        <span className="ml-auto pb-1 text-[11px] text-ink-faint">{rows.length} engineers</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {rows.length === 0 ? (
          <div className="p-4"><EmptyState icon={<ShieldCheck className="h-5 w-5" />} title="No engineers match" description="Try a different verification state or partner." /></div>
        ) : (
          <>
            <Table>
              <THead columns={[{ label: "Engineer" }, { label: "Partner" }, { label: "Location" }, { label: "Expertise" }, { label: "Documents" }, { label: "Rating" }, { label: "Assignments" }, { label: "Verification" }]} />
              <TBody>
                {paged.map((r) => (
                  <Tr key={r.e.id} onClick={() => router.push(`/admin/engineers/${r.e.id}`)}>
                    <Td>
                      <p className="text-[13px] font-medium text-ink">{r.e.name}</p>
                      <p className="font-mono text-[10px] text-ink-faint">{r.e.id} · {r.e.experienceYears} yrs</p>
                    </Td>
                    <Td><span className="text-[12px] text-ink-soft">{r.partnerName}</span></Td>
                    <Td><span className="text-[12px] text-ink-soft">{r.e.city}<br /><span className="text-ink-faint">{r.e.state}</span></span></Td>
                    <Td><span className="block max-w-48 truncate text-[12px] text-ink-soft">{r.e.skills.slice(0, 2).join(", ")}</span></Td>
                    <Td>
                      {r.documentsPending ? (
                        <Badge tone="amber">{r.documentsPending} pending</Badge>
                      ) : (
                        <Badge tone="green">Complete</Badge>
                      )}
                    </Td>
                    <Td><span className="text-[12px] text-ink-soft">{r.e.rating.toFixed(1)}</span></Td>
                    <Td><span className="text-[12px] text-ink-soft">{r.assignments}</span></Td>
                    <Td><VerificationBadge status={r.e.verification} /></Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={safePage} totalPages={totalPages} total={rows.length} onPage={setPage} pageSizeLabel={`${PAGE_SIZE} per page`} />
          </>
        )}
      </div>
    </div>
  );
}
