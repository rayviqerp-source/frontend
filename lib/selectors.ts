import type {
  AppState,
  Engineer,
  Role,
  Ticket,
  TicketPriority,
  TicketStatus,
} from "./types";
import { OPEN_STATUSES, TICKET_STATUS_LABELS } from "./constants";
import { daysBetween } from "./utils";

/* ---------------- ticket scoping by role ---------------- */

export function visibleTickets(state: AppState, role: Role, oemId: string | null): Ticket[] {
  if (role === "super_admin" || role === "ops_manager" || role === "support_executive") {
    return state.tickets;
  }
  if (role === "engineer" || role === "partner_manager") {
    const engineerIds =
      role === "engineer"
        ? [state.users.find((u) => u.id === state.currentUserId)?.engineerId ?? ""]
        : state.engineers.filter((e) => e.partnerId === state.users.find((u) => u.id === state.currentUserId)?.partnerId).map((e) => e.id);
    return state.tickets.filter(
      (t) =>
        (t.assignedEngineerId && engineerIds.includes(t.assignedEngineerId)) ||
        state.assignments.some(
          (a) => a.ticketId === t.id && engineerIds.includes(a.engineerId) && a.state === "pending_offer",
        ),
    );
  }
  return oemId ? state.tickets.filter((t) => t.oemId === oemId) : state.tickets;
}

/* ---------------- KPI helpers ---------------- */

export interface TicketKpis {
  total: number;
  fresh: number;
  open: number;
  inProgress: number;
  completed: number;
  overdue: number;
  unassigned: number;
  awaitingReview: number;
  escalated: number;
  avgResponseMins: number;
  avgResolutionHours: number;
}

export function ticketKpis(tickets: Ticket[]): TicketKpis {
  const open = tickets.filter((t) => OPEN_STATUSES.includes(t.status));
  const unassigned = tickets.filter((t) => !t.assignedEngineerId && OPEN_STATUSES.includes(t.status));
  const overdue = tickets.filter(
    (t) => OPEN_STATUSES.includes(t.status) && t.dueAt < new Date().toISOString(),
  );
  const done = tickets.filter((t) => t.status === "completed" || t.status === "closed");
  const responseSamples = tickets
    .map((t) => {
      const first = t.timeline.find((e) => e.type === "assignment" || e.type === "response" || e.type === "status");
      return first ? (new Date(first.at).getTime() - new Date(t.createdAt).getTime()) / 60000 : null;
    })
    .filter((v): v is number => v !== null && v >= 0);
  const resolutionSamples = done.map((t) =>
    Math.round((new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()) / 3_600_000),
  );
  const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
  return {
    total: tickets.length,
    fresh: tickets.filter((t) => t.status === "new").length,
    open: open.length,
    inProgress: tickets.filter((t) => t.status === "in_progress" || t.status === "visit_scheduled" || t.status === "contact_pending").length,
    completed: done.length,
    overdue: overdue.length,
    unassigned: unassigned.length,
    awaitingReview: tickets.filter((t) => t.status === "awaiting_oem_review" || t.status === "report_submitted").length,
    escalated: tickets.filter((t) => t.status === "escalated").length,
    avgResponseMins: avg(responseSamples),
    avgResolutionHours: avg(resolutionSamples),
  };
}

export function statusBreakdown(tickets: Ticket[]): { status: TicketStatus; label: string; count: number }[] {
  const counts = new Map<TicketStatus, number>();
  tickets.forEach((t) => counts.set(t.status, (counts.get(t.status) ?? 0) + 1));
  return (Object.keys(TICKET_STATUS_LABELS) as TicketStatus[])
    .map((s) => ({ status: s, label: TICKET_STATUS_LABELS[s], count: counts.get(s) ?? 0 }))
    .filter((x) => x.count > 0);
}

export function priorityBreakdown(tickets: Ticket[]): { priority: TicketPriority; count: number }[] {
  return (["critical", "high", "medium", "low"] as TicketPriority[]).map((p) => ({
    priority: p,
    count: tickets.filter((t) => t.priority === p).length,
  }));
}

/** Month buckets for the last `months` months (label + created + completed). */
export function monthlyTrend(tickets: Ticket[], months = 6): { month: string; created: number; completed: number }[] {
  const out: { month: string; created: number; completed: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("en-US", { month: "short" });
    const inMonth = (iso: string) => {
      const x = new Date(iso);
      return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth();
    };
    out.push({
      month: label,
      created: tickets.filter((t) => inMonth(t.createdAt)).length,
      completed: tickets.filter((t) => (t.closedAt || t.updatedAt) && inMonth(t.closedAt ?? t.updatedAt) && (t.status === "completed" || t.status === "closed")).length,
    });
  }
  return out;
}

export function cityDistribution(tickets: Ticket[]): { city: string; count: number }[] {
  const map = new Map<string, number>();
  tickets.forEach((t) => map.set(t.location.city, (map.get(t.location.city) ?? 0) + 1));
  return [...map.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);
}

export function categoryDistribution(tickets: Ticket[]): { category: string; count: number }[] {
  const map = new Map<string, number>();
  tickets.forEach((t) => map.set(t.issue.category, (map.get(t.issue.category) ?? 0) + 1));
  return [...map.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export interface EngineerStatsRow {
  engineer: Engineer;
  openTickets: number;
  completedTickets: number;
  score: number;
}

export function engineerStats(state: AppState): EngineerStatsRow[] {
  return state.engineers.map((engineer) => {
    const mine = state.tickets.filter((t) => t.assignedEngineerId === engineer.id);
    const completedTickets = mine.filter((t) => t.status === "completed" || t.status === "closed").length;
    const openTickets = mine.filter((t) => OPEN_STATUSES.includes(t.status)).length;
    const score = Math.round(
      engineer.rating * 10 * 0.4 +
        engineer.reportQualityScore * 0.3 +
        engineer.acceptanceRate * 0.3,
    );
    return { engineer, openTickets, completedTickets, score: Number.isFinite(score) ? score : 0 };
  });
}

/* ---------------- assignment recommendations ---------------- */

export interface Recommendation {
  engineer: Engineer;
  score: number;
  reasons: string[];
  concerns: string[];
}

/**
 * Demo matching engine — location, skills, expertise, availability, workload
 * and service radius, with a plain-English explanation for each factor.
 */
export function recommendEngineers(state: AppState, ticket: Ticket, limit = 5): Recommendation[] {
  const siteCity = ticket.location.city.toLowerCase();
  const siteState = ticket.location.state;
  const recs: Recommendation[] = [];

  for (const e of state.engineers) {
    if (e.verification !== "approved" || e.status !== "active") continue;
    if (e.exclusiveOemId && e.exclusiveOemId !== ticket.oemId) continue;
    let score = 0;
    const reasons: string[] = [];
    const concerns: string[] = [];

    if (e.city.toLowerCase() === siteCity) {
      score += 34;
      reasons.push(`Based in ${e.city} — minimal travel`);
    } else if (e.state === siteState) {
      score += 22;
      reasons.push(`Same state (${e.state}) — within service radius`);
    } else {
      score += 6;
      concerns.push(`Out of state — travel may extend visit date`);
    }

    const category = ticket.product.category;
    if (e.productExpertise.includes(category)) {
      score += 24;
      reasons.push(`Experienced with ${category.replace(/_/g, " ")}`);
    } else {
      concerns.push(`No verified ${category.replace(/_/g, " ")} experience`);
    }

    const groupMatch =
      (ticket.issue.categoryGroup === "communication" && e.skills.some((s) => /communication|wi-?fi|monitoring/i.test(s))) ||
      (ticket.issue.categoryGroup === "electrical" && e.skills.some((s) => /electrical|diagnosis|repair/i.test(s))) ||
      (ticket.issue.categoryGroup === "performance" && e.skills.some((s) => /string|testing|diagnosis/i.test(s))) ||
      (ticket.issue.categoryGroup === "mechanical" && e.skills.some((s) => /repair|service/i.test(s)));
    if (groupMatch) {
      score += 14;
      reasons.push("Skills match the issue category");
    }

    if (e.availability === "available") {
      score += 14;
      reasons.push("Available now");
    } else if (e.availability === "busy") {
      score += 5;
      concerns.push("Currently on other assignments");
    } else {
      concerns.push("Marked offline");
    }

    const loadRatio = e.currentLoad / e.maxLoad;
    if (loadRatio < 0.5) {
      score += 14;
      reasons.push(`Light workload (${e.currentLoad}/${e.maxLoad})`);
    } else if (loadRatio < 0.85) {
      score += 7;
      reasons.push(`Moderate workload (${e.currentLoad}/${e.maxLoad})`);
    } else {
      score -= 8;
      concerns.push(`Near capacity (${e.currentLoad}/${e.maxLoad})`);
    }

    if (e.rating >= 4.5) {
      score += 6;
      reasons.push(`Rating ${e.rating.toFixed(1)}/5`);
    } else if (e.rating > 0 && e.rating < 4) {
      score -= 6;
      concerns.push(`Rating ${e.rating.toFixed(1)}/5`);
    }

    if (e.state === siteState && e.city.toLowerCase() !== siteCity) {
      const approxKm = 120;
      if (approxKm <= e.serviceRadiusKm) {
        score += 4;
        reasons.push(`Within ${e.serviceRadiusKm} km service radius`);
      } else {
        score -= 10;
        concerns.push(`Destination may exceed ${e.serviceRadiusKm} km radius`);
      }
    }

    recs.push({ engineer: e, score: Math.max(0, Math.min(100, score)), reasons, concerns });
  }

  return recs.sort((a, b) => b.score - a.score).slice(0, limit);
}

/* ---------------- misc ---------------- */

export function slaHealth(tickets: Ticket[]): { label: string; count: number; tone: "green" | "amber" | "red" }[] {
  const open = tickets.filter((t) => OPEN_STATUSES.includes(t.status));
  const now = Date.now();
  const atRisk = open.filter((t) => {
    const remain = (new Date(t.sla.resolutionDueAt).getTime() - now) / 3_600_000;
    return remain > 0 && remain <= 12;
  });
  const breached = open.filter((t) => t.sla.breached || new Date(t.sla.resolutionDueAt).getTime() < now);
  const healthy = open.filter((t) => !atRisk.includes(t) && !breached.includes(t));
  return [
    { label: "On track", count: healthy.length, tone: "green" },
    { label: "At risk (<12h)", count: atRisk.length, tone: "amber" },
    { label: "Breached", count: breached.length, tone: "red" },
  ];
}

export function ageOf(ticket: Ticket): number {
  return Math.max(
    0,
    daysBetween(ticket.createdAt, ticket.closedAt ?? new Date().toISOString()),
  );
}

export function recentActivity(state: AppState, limit = 8): {
  at: string;
  title: string;
  detail?: string;
  ref?: string;
  kind: "ticket" | "system";
}[] {
  const items = state.tickets.flatMap((t) =>
    t.timeline.map((e) => ({ at: e.at, title: e.title, detail: e.detail, ref: t.ref, kind: "ticket" as const })),
  );
  return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit);
}

export function engineerLoadLabel(e: Engineer): { label: string; tone: "green" | "amber" | "red" } {
  const ratio = e.currentLoad / e.maxLoad;
  if (ratio < 0.5) return { label: "Light", tone: "green" };
  if (ratio < 0.85) return { label: "Moderate", tone: "amber" };
  return { label: "Heavy", tone: "red" };
}

export function overdueVisits(state: AppState) {
  const now = new Date().toISOString();
  return state.visits.filter((v) => v.status === "scheduled" && v.scheduledFor < now);
}

export function upcomingVisits(state: AppState, hoursAhead = 48) {
  const now = Date.now();
  const limit = now + hoursAhead * 3_600_000;
  return state.visits
    .filter((v) => v.status === "scheduled" && new Date(v.scheduledFor).getTime() >= now && new Date(v.scheduledFor).getTime() <= limit)
    .sort((a, b) => (a.scheduledFor < b.scheduledFor ? -1 : 1));
}
