"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, ShieldCheck, Users, Wrench } from "lucide-react";
import { useStore } from "@/lib/store";
import { can } from "@/lib/permissions";
import { engineerLoadLabel, engineerStats } from "@/lib/selectors";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Pagination, SearchInput, Table, TBody, Td, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { downloadCsv, initials } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function EngineersPage() {
  const router = useRouter();
  const { state, effectiveRole } = useStore();
  const [query, setQuery] = useState("");
  const [verification, setVerification] = useState("");
  const [availability, setAvailability] = useState("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return engineerStats(state).filter(({ engineer: e }) => {
      if (verification && e.verification !== verification) return false;
      if (availability && e.availability !== availability) return false;
      if (city && e.city !== city) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.phone.toLowerCase().includes(q) ||
        e.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [state, query, verification, availability, city]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const cities = [...new Set(state.engineers.map((e) => e.city))].sort();

  return (
    <div>
      <PageHeader
        title="Engineer network"
        description="Verified field capacity across your service regions. Matching considers location, product expertise, workload, rating and availability."
        breadcrumbs={<Breadcrumbs />}
        actions={
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                "rayviq-engineers",
                rows.map(({ engineer: e, openTickets, completedTickets, score }) => ({
                  id: e.id,
                  name: e.name,
                  city: e.city,
                  state: e.state,
                  verification: e.verification,
                  availability: e.availability,
                  skills: e.skills.join("; "),
                  rating: e.rating,
                  openTickets,
                  completedTickets,
                  score,
                })),
              )
            }
          >
            <Download className="h-4 w-4" aria-hidden /> Export
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total engineers" value={state.engineers.length} icon={<Users className="h-4 w-4" />} tone="brand" hint={`${cities.length} cities covered`} />
        <StatCard label="Available now" value={state.engineers.filter((e) => e.availability === "available").length} icon={<Wrench className="h-4 w-4" />} tone="success" hint="Accepting new offers" />
        <StatCard label="Pending verification" value={state.engineers.filter((e) => e.verification !== "approved").length} icon={<ShieldCheck className="h-4 w-4" />} tone="warning" hint="Onboarding or re-review" />
        <StatCard label="Avg. rating" value={(state.engineers.reduce((a, e) => a + e.rating, 0) / Math.max(1, state.engineers.length)).toFixed(1)} icon={<Users className="h-4 w-4" />} hint="Across the network" />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search name, ID, city, skill…" className="w-full sm:w-72" />
        <Select value={verification} onChange={(e) => { setVerification(e.target.value); setPage(1); }} placeholder="All verification" options={["approved", "submitted", "under_verification", "more_info_required", "rejected", "draft"].map((s) => ({ value: s, label: s.replace(/_/g, " ") }))} className="w-44" />
        <Select value={availability} onChange={(e) => { setAvailability(e.target.value); setPage(1); }} placeholder="All availability" options={["available", "busy", "offline"].map((s) => ({ value: s, label: s }))} className="w-40" />
        <Select value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }} placeholder="All cities" options={cities.map((c) => ({ value: c, label: c }))} className="w-36" />
        <span className="ml-auto pb-1 text-[11px] text-ink-faint">{rows.length} engineers</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {paged.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={<Users className="h-5 w-5" />} title="No engineers match" description="Adjust verification, availability, city or search." />
          </div>
        ) : (
          <>
            <Table>
              <THead columns={[{ label: "Engineer" }, { label: "Location" }, { label: "Expertise" }, { label: "Verification" }, { label: "Availability" }, { label: "Load" }, { label: "Jobs" }, { label: "Rating" }]} />
              <TBody>
                {paged.map(({ engineer: e, openTickets, completedTickets }) => {
                  const load = engineerLoadLabel(e);
                  return (
                    <Tr key={e.id} onClick={() => router.push(`/oem/engineers/${e.id}`)}>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand-700">{initials(e.name)}</span>
                          <div>
                            <p className="text-[13px] font-medium text-ink">{e.name}</p>
                            <p className="text-[11px] text-ink-faint">{e.id} · {e.experienceYears}y exp</p>
                          </div>
                        </div>
                      </Td>
                      <Td><p className="text-[12px] text-ink-soft">{e.city}</p><p className="text-[11px] text-ink-faint">{e.state} · {e.serviceRadiusKm} km</p></Td>
                      <Td><p className="max-w-48 truncate text-[12px] text-ink-soft">{e.productExpertise.map((p) => p.replace(/_/g, " ")).join(", ")}</p></Td>
                      <Td><VerificationBadge status={e.verification} /></Td>
                      <Td><Badge tone={e.availability === "available" ? "green" : e.availability === "busy" ? "amber" : "gray"}>{e.availability}</Badge></Td>
                      <Td><Badge tone={load.tone === "green" ? "green" : load.tone === "amber" ? "amber" : "red"}>{e.currentLoad}/{e.maxLoad} {load.label}</Badge></Td>
                      <Td><span className="text-[12px] text-ink">{openTickets} open</span><p className="text-[11px] text-ink-faint">{completedTickets} done</p></Td>
                      <Td><span className="text-[12px] font-medium text-ink">{e.rating.toFixed(1)}</span><p className="text-[11px] text-ink-faint">{e.acceptanceRate}% accept</p></Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
            <Pagination page={safePage} totalPages={totalPages} total={rows.length} onPage={setPage} pageSizeLabel={`${PAGE_SIZE} per page`} />
          </>
        )}
      </div>
      {can(effectiveRole, "admin.engineers.verify") && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-ink-faint">
          <ShieldCheck className="h-3 w-3" aria-hidden /> You can approve, reject or request more information from an engineer profile.
        </p>
      )}
    </div>
  );
}
