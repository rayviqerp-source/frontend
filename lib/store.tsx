"use client";

/**
 * Client-side demo store.
 *
 * Everything here simulates what a real API would do. Mutations append
 * timeline events / audit entries / notifications exactly the way the future
 * backend should, and persist to localStorage so the demo survives refreshes.
 * This is NOT a security boundary — real enforcement belongs on the server.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AmcContract,
  AppState,
  Assignment,
  AuditLog,
  AppNotification,
  Customer,
  DemoUser,
  Engineer,
  Equipment,
  Escalation,
  Integration,
  MaintenanceVisit,
  Oem,
  PlatformSettings,
  RepairProductType,
  RepairRequest,
  RepairRequestStatus,
  Role,
  ServicePartner,
  ServiceReport,
  Site,
  SubscriptionPlan,
  OrganisationSubscription,
  Ticket,
  TicketStatus,
  Visit,
} from "./types";
import {
  seedAmcContracts,
  seedAssignments,
  seedAuditLogs,
  seedCustomers,
  seedEngineers,
  seedEquipment,
  seedEscalations,
  seedIntegrations,
  seedMaintenanceVisits,
  seedNotifications,
  seedOems,
  seedPartners,
  seedPlans,
  seedRepairRequests,
  seedReports,
  seedSettings,
  seedSites,
  seedSubscriptions,
  seedTickets,
  seedUsers,
  seedVisits,
} from "./seed";
import {
  REPAIR_PRODUCT_TYPE_LABELS,
  REPAIR_REQUEST_TRANSITIONS,
  TICKET_TRANSITIONS,
} from "./constants";
import {
  REPAIR_ADMIN_ROLES,
  canRepairTransition,
  canTransition,
  rolesForTransition,
} from "./permissions";
import { addHours, addMinutes, localId, nextTicketRef, todayIso } from "./utils";

const STORAGE_KEY = "rayviq.demo.state";
const STATE_VERSION = 8;

function buildSeedState(): AppState {
  return {
    version: STATE_VERSION,
    users: seedUsers,
    currentUserId: null,
    roleOverride: null,
    oems: seedOems,
    partners: seedPartners,
    engineers: seedEngineers,
    customers: seedCustomers,
    sites: seedSites,
    equipment: seedEquipment,
    tickets: seedTickets,
    repairRequests: seedRepairRequests,
    assignments: seedAssignments,
    visits: seedVisits,
    reports: seedReports,
    escalations: seedEscalations,
    amcContracts: seedAmcContracts,
    maintenanceVisits: seedMaintenanceVisits,
    notifications: seedNotifications,
    auditLogs: seedAuditLogs,
    plans: seedPlans,
    subscriptions: seedSubscriptions,
    integrations: seedIntegrations,
    settings: seedSettings,
    portalCustomerIds: [],
    portalCustomerId: null,
  };
}

/**
 * Vendor directory data (name, bundled logo) is owned by the seed, not by the
 * browser snapshot. Older v8 snapshots predate the vendor rename/logo fields,
 * so merge those fields back on load. User-created data (requests, customers,
 * timeline, uploaded logoUrl) is left untouched.
 */
function withCurrentVendors(parsed: AppState): AppState {
  const seedById = new Map(seedPartners.map((p) => [p.id, p]));
  parsed.partners = (parsed.partners ?? []).map((partner) => {
    const seed = seedById.get(partner.id);
    if (!seed) return partner;
    return {
      ...partner,
      name: seed.name,
      image: seed.image,
      logoUrl: partner.logoUrl ?? seed.logoUrl,
    };
  });
  return parsed;
}

function loadState(): AppState {
  if (typeof window === "undefined") return buildSeedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeedState();
    const parsed = JSON.parse(raw) as AppState;
    if (parsed && parsed.version === STATE_VERSION) return withCurrentVendors(parsed);
    return buildSeedState();
  } catch {
    return buildSeedState();
  }
}

const actorName = (draft: AppState, override?: string): string => {
  if (override) return override;
  const u = draft.users.find((x) => x.id === draft.currentUserId);
  if (u) return u.name;
  const ovr = draft.roleOverride;
  const byRole = draft.users.find((x) => x.role === ovr);
  return byRole?.name ?? "RAYVIQ Operations";
};

const actorRole = (draft: AppState, override?: Role | "system"): Role | "system" => {
  if (override) return override;
  if (draft.roleOverride) return draft.roleOverride;
  const u = draft.users.find((x) => x.id === draft.currentUserId);
  if (u) return u.role;
  return draft.roleOverride ?? "ops_manager";
};

const audit = (
  draft: AppState,
  action: string,
  target: string,
  detail?: string,
  severity: AuditLog["severity"] = "info",
  targetRef?: string,
) => {
  draft.auditLogs.unshift({
    id: localId("AUD"),
    at: todayIso(),
    actor: actorName(draft),
    actorRole: actorRole(draft),
    action,
    target,
    targetRef,
    detail,
    severity,
  });
};

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: "success" | "error" | "info";
}

interface StoreContextValue {
  state: AppState;
  ready: boolean;
  /* session */
  currentUser: DemoUser | null;
  effectiveRole: Role;
  login: (userId: string) => void;
  /** Sign in a backend-registered account (creates a matching local user record). */
  loginRemoteUser: (input: {
    email: string;
    name: string;
    platformRole?: string;
    company?: string | null;
  }) => DemoUser;
  logout: () => void;
  setRoleOverride: (role: Role | null) => void;
  /* toasts */
  toasts: ToastMessage[];
  toast: (title: string, opts?: { description?: string; tone?: ToastMessage["tone"] }) => void;
  dismissToast: (id: string) => void;
  /* mutations */
  createTicket: (input: NewTicketInput) => Ticket;
  updateTicket: (id: string, patch: Partial<Ticket>, note?: string) => void;
  transitionTicket: (id: string, to: TicketStatus, note?: string, actorOverride?: string) => boolean;
  addTicketNote: (id: string, body: string, visibility: "oem_internal" | "platform_internal") => void;
  assignTicket: (ticketId: string, engineerId: string) => void;
  respondToOffer: (ticketId: string, accept: boolean, reason?: string) => void;
  revokeOffer: (assignmentId: string) => void;
  markCustomerContacted: (ticketId: string, note?: string) => void;
  scheduleVisit: (ticketId: string, engineerId: string, scheduledFor: string, slot: string, notes?: string) => void;
  updateVisit: (visitId: string, status: Visit["status"], reason?: string) => void;
  startVisit: (visitId: string) => void;
  submitReport: (ticketId: string, body: ServiceReportBody) => void;
  reviewReport: (
    reportId: string,
    decision: "approved" | "clarification_requested" | "rejected",
    remark: string,
  ) => void;
  raiseEscalation: (ticketId: string, reason: string, target: Escalation["target"]) => void;
  resolveEscalation: (escalationId: string, resolution: string) => void;
  closeTicket: (ticketId: string) => void;
  /* inverter repair service requests */
  createRepairRequest: (input: NewRepairRequestInput) => RepairRequestResult;
  respondToRepairRequest: (
    id: string,
    decision: "accepted" | "rejected",
    note?: string,
  ) => boolean;
  setRepairRequestStatus: (
    id: string,
    to: RepairRequestStatus,
    note?: string,
  ) => boolean;
  setRepairCompanyStatus: (
    companyId: string,
    status: ServicePartner["status"],
    note?: string,
  ) => boolean;
  /** Vendor registration — create a repair company that appears in the public directory. */
  addRepairCompany: (
    input: Pick<ServicePartner, "name" | "contactName" | "phone" | "email" | "city" | "state"> &
      Partial<ServicePartner>,
  ) => ServicePartner;
  /** Persist a company logo reference (hosted URL or data URL) on the partner record. */
  setRepairCompanyLogo: (companyId: string, logoUrl: string) => boolean;
  /* engineers */
  setEngineerVerification: (engineerId: string, status: Engineer["verification"], note?: string) => void;
  setEngineerStatus: (engineerId: string, status: Engineer["status"], note?: string) => void;
  updateEngineer: (engineerId: string, patch: Partial<Engineer>) => void;
  /** Client app — customer edits their own account details. */
  updateCustomer: (customerId: string, patch: Partial<Customer>) => void;
  /** Vendor panel — onboard a new engineer into the verification queue. */
  addEngineer: (input: Partial<Engineer> & { name: string; partnerId: string | null }) => void;
  /* oems */
  updateOem: (oemId: string, patch: Partial<Oem>) => void;
  addOem: (input: Partial<Oem> & { name: string }) => void;
  /* platform */
  updateSettings: (patch: Partial<PlatformSettings>) => void;
  toggleIntegration: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  /* portal demo */
  portalLogin: (customerId: string) => void;
  portalLogout: () => void;
  /** Client app — sign up a new customer account (auto signs them in). */
  registerCustomer: (input: {
    name: string;
    phone: string;
    email?: string;
    city: string;
    state?: string;
    pincode?: string;
    company?: string;
    type?: Customer["type"];
  }) => Customer;
}

export interface NewTicketInput {
  oemId?: string;
  customerId: string;
  siteId: string;
  equipmentId?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  company?: string;
  address?: string;
  state?: string;
  city?: string;
  pincode?: string;
  model?: string;
  serialNumber?: string;
  warrantyStatus?: Ticket["product"]["warrantyStatus"];
  category: string;
  categoryGroup: Ticket["issue"]["categoryGroup"];
  description: string;
  errorCode?: string;
  priority: Ticket["priority"];
  availability?: string;
  source?: Ticket["source"];
}

export interface ServiceReportBody {
  inspectionFindings: string;
  diagnosis: string;
  workPerformed: string;
  partsUsed: string;
  errorCodes: string;
  recommendations: string;
  followUpRequired: boolean;
  safetyObservations?: string;
  customerAcknowledged: boolean;
  evidenceNames: string[];
}

/* ------------------------------------------------------------------ */
/* Inverter repair service requests                                      */
/* ------------------------------------------------------------------ */

export interface NewRepairRequestInput {
  /** Customer raising the request — must own the portal session. */
  customerId: string;
  /** Service partner (repair company) the request is sent to. */
  companyId: string;
  /** Equipment family — defaults to `inverter` when omitted. */
  productType?: RepairProductType;
  contactName: string;
  contactPhone: string;
  /** Optional company the customer is raising the complaint for. */
  contactCompany?: string;
  contactEmail?: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  brand: string;
  model?: string;
  capacityKw?: number;
  category?: string;
  serialNumber?: string;
  yearOfInstallation?: string;
  problemCategory: string;
  description: string;
  errorCode?: string;
  serviceMode?: string;
  preferredDate?: string;
  /** File name of the uploaded photo (demo stores the name only). */
  attachmentName?: string;
}

export interface RepairRequestResult {
  ok: boolean;
  request?: RepairRequest;
  /** Field-level validation errors, keyed by form field. */
  errors?: Record<string, string>;
}

const REPAIR_MIN_DESCRIPTION = 10;

/** Digits-only phone length check — mirrors the client sign-up rule. */
function phoneDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

/**
 * Validates a new repair request. Returns a per-field error map so the
 * form can highlight the exact fields that need attention.
 */
export function validateRepairRequest(
  input: NewRepairRequestInput,
  company?: ServicePartner,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (input.contactName.trim().length < 2) {
    errors.contactName = "Enter the contact person's full name.";
  }
  if (phoneDigits(input.contactPhone) < 10) {
    errors.contactPhone = "Enter a valid 10-digit contact number.";
  }
  if (input.address.trim().length < 5) {
    errors.address = "Enter the service address (street, area).";
  }
  if (!input.city.trim()) {
    errors.city = "Enter the city.";
  }
  if (input.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail.trim())) {
    errors.contactEmail = "Enter a valid email address.";
  }
  if (!input.brand.trim()) {
    errors.brand = "Select the brand.";
  }
  if (input.capacityKw !== undefined && (input.capacityKw <= 0 || input.capacityKw > 1000)) {
    errors.capacityKw = "Capacity must be between 1 and 1000.";
  }
  if (!input.problemCategory.trim()) {
    errors.problemCategory = "Select the fault type.";
  }
  if (input.description.trim().length < REPAIR_MIN_DESCRIPTION) {
    errors.description = `Describe the problem in at least ${REPAIR_MIN_DESCRIPTION} characters.`;
  }
  if (company && company.status !== "active") {
    errors.companyId = "This repair company is not accepting requests right now.";
  }

  return errors;
}

/** Next sequential reference for a repair request, e.g. `RPR-2026-0005`. */
export function nextRepairRef(existing: number): string {
  return `RPR-${new Date().getFullYear()}-${String(existing).padStart(4, "0")}`;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(buildSeedState);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /* hydrate from localStorage after mount (avoids hydration mismatch) */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from the external localStorage store
    setState(loadState());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota / private mode — demo continues in memory */
    }
  }, [state, ready]);

  const toast = useCallback<StoreContextValue["toast"]>((title, opts) => {
    const id = localId("toast");
    setToasts((t) => [
      ...t,
      { id, title, description: opts?.description, tone: opts?.tone ?? "success" },
    ]);
    const timer = setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
      timers.current.delete(id);
    }, 4200);
    timers.current.set(id, timer);
  }, []);

  const dismissToast = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setToasts((list) => list.filter((x) => x.id !== id));
  }, []);

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.currentUserId) ?? null,
    [state.users, state.currentUserId],
  );
  const effectiveRole: Role = state.roleOverride ?? currentUser?.role ?? "support_executive";

  /* ---------------- helpers ---------------- */

  const mutate = useCallback((fn: (draft: AppState) => void) => {
    setState((prev) => {
      const draft: AppState = structuredClone(prev);
      fn(draft);
      return draft;
    });
  }, []);

  const notify = (
    draft: AppState,
    n: Pick<AppNotification, "title" | "body" | "type" | "audience"> &
      Partial<Pick<AppNotification, "oemId" | "engineerId" | "ticketRef" | "channels">>,
  ) => {
    draft.notifications.unshift({
      id: localId("NOT"),
      createdAt: todayIso(),
      readBy: [],
      channels: n.channels ?? ["in_app"],
      delivery: draft.settings.notificationChannels.email ? "delivered" : "queued",
      ...n,
    });
  };

  /* ---------------- session ---------------- */

  const login = useCallback((userId: string) => {
    mutate((d) => {
      d.currentUserId = userId;
      d.roleOverride = null;
    });
  }, [mutate]);

  const loginRemoteUser = useCallback<StoreContextValue["loginRemoteUser"]>(
    (input) => {
      const holder: { user?: DemoUser } = {};
      mutate((d) => {
        const email = input.email.toLowerCase();
        let user = d.users.find((u) => u.email.toLowerCase() === email);
        if (!user) {
          const maxN = d.users.reduce((m, u) => {
            const n = Number(u.id.replace(/\D/g, ""));
            return Number.isFinite(n) && u.id.startsWith("USR-") ? Math.max(m, n) : m;
          }, 0);
          const role = (
            ["oem_admin", "oem_service_manager", "oem_service_executive", "partner_manager", "engineer", "super_admin", "ops_manager", "support_executive"].includes(
              input.platformRole ?? "",
            )
              ? input.platformRole
              : "oem_admin"
          ) as Role;
          user = {
            id: `USR-${String(maxN + 1).padStart(2, "0")}`,
            name: input.name,
            email,
            role,
            oemId: role.startsWith("oem_") ? "OEM-001" : null,
            partnerId: role === "partner_manager" || role === "engineer" ? "SP-01" : null,
            engineerId: role === "engineer" ? "ENG-01" : null,
            phone: "",
            designation: input.company ?? undefined,
            avatarColor: "#2554e0",
            createdAt: todayIso(),
          };
          d.users.push(user);
          audit(
            d,
            "Workspace account signed in",
            `${user.name} (${user.id})`,
            `Registered account · ${email}`,
            "info",
            user.id,
          );
        }
        d.currentUserId = user.id;
        d.roleOverride = null;
        holder.user = user;
      });
      if (!holder.user) throw new Error("Remote sign-in failed");
      return holder.user;
    },
    [mutate],
  );

  const logout = useCallback(() => {
    mutate((d) => {
      d.currentUserId = null;
      d.roleOverride = null;
    });
  }, [mutate]);

  const setRoleOverride = useCallback(
    (role: Role | null) => {
      mutate((d) => {
        d.roleOverride = role;
      });
    },
    [mutate],
  );

  /* ---------------- tickets ---------------- */

  const createTicket = useCallback<StoreContextValue["createTicket"]>(
    (input) => {
      const now = todayIso();
      const holder: { ticket?: Ticket } = {};
      mutate((d) => {
        const oemId = input.oemId ?? d.users.find((u) => u.id === d.currentUserId)?.oemId ?? "OEM-001";
        const site = d.sites.find((s) => s.id === input.siteId);
        const equipment = d.equipment.find((e) => e.id === input.equipmentId);
        const customer = d.customers.find((c) => c.id === input.customerId);
        const priority = input.priority;
        const resolutionHours =
          priority === "critical" ? 24 : priority === "high" ? 48 : priority === "medium" ? 96 : 168;
        const seqNo = d.tickets.reduce((max, t) => {
          const num = Number(t.ref.split("-").pop());
          return Number.isFinite(num) ? Math.max(max, num) : max;
        }, 0);
        const ticket: Ticket = {
          id: localId("TKT"),
          ref: nextTicketRef(seqNo + 1),
          oemId,
          status: "new",
          priority,
          createdAt: now,
          updatedAt: now,
          dueAt: addHours(now, resolutionHours),
          source: input.source ?? "portal",
          customerId: input.customerId,
          siteId: input.siteId,
          equipmentId: input.equipmentId,
          contact: {
            name: input.contactName || customer?.name || "Site contact",
            phone: input.contactPhone || customer?.phone || "",
            email: input.contactEmail || customer?.email,
            company: input.company || customer?.company,
            availability: input.availability || "Weekdays 10:00 – 18:00",
          },
          location: {
            address: input.address || site?.address || "",
            state: input.state || site?.state || "",
            city: input.city || site?.city || "",
            pincode: input.pincode || site?.pincode || "",
            gps: site?.gps,
          },
          product: {
            model: input.model || equipment?.model || "",
            serialNumber: input.serialNumber || equipment?.serialNumber || "",
            category: equipment?.category ?? "string_inverter",
            installationDate: equipment?.installationDate,
            warrantyStatus: input.warrantyStatus ?? (equipment ? "in_warranty" : "unknown"),
            amcId: site?.amcId,
          },
          issue: {
            category: input.category,
            description: input.description,
            errorCode: input.errorCode,
            categoryGroup: input.categoryGroup,
          },
          sla: {
            responseDueAt: addMinutes(now, d.settings.slaTargets.find((s) => s.priority === priority)?.responseMins ?? 240),
            assignmentDueAt: addHours(now, 4),
            visitDueAt: addHours(now, resolutionHours / 2),
            resolutionDueAt: addHours(now, resolutionHours),
            breached: false,
          },
          attachments: [],
          timeline: [
            {
              id: localId("TL"),
              at: now,
              actor: actorName(d),
              actorRole: actorRole(d),
              type: "created",
              title: "Ticket created",
              detail: input.description.slice(0, 140),
              toStatus: "new",
            },
            {
              id: localId("TL"),
              at: now,
              actor: "System",
              actorRole: "system",
              type: "sla",
              title: "SLA clock started",
              detail: `${priority} priority — resolution target ${resolutionHours}h.`,
            },
          ],
          notes: [],
          escalationIds: [],
          createdBy: d.currentUserId ?? "USR-01",
        };
        d.tickets.unshift(ticket);
        holder.ticket = ticket;
        audit(d, "Ticket created", ticket.ref, `${priority} · ${input.category}`, priority === "critical" ? "warning" : "info", ticket.id);
        notify(d, {
          title: `${priority === "critical" ? "Critical " : ""}Ticket created`,
          body: `${ticket.ref} — ${input.category} at ${ticket.location.city}.`,
          type: "ticket_created",
          audience: ["oem_admin", "oem_service_manager", "oem_service_executive", "super_admin", "ops_manager"],
          oemId,
          ticketRef: ticket.ref,
        });
      });
      if (!holder.ticket) throw new Error("Ticket creation failed");
      return holder.ticket;
    },
    [mutate],
  );

  const updateTicket = useCallback<StoreContextValue["updateTicket"]>(
    (id, patch, note) => {
      mutate((d) => {
        const t = d.tickets.find((x) => x.id === id);
        if (!t) return;
        Object.assign(t, patch);
        t.updatedAt = todayIso();
        if (note) {
          t.notes.unshift({
            id: localId("NOTE"),
            author: actorName(d),
            body: note,
            at: todayIso(),
            visibility: "oem_internal",
          });
        }
        t.timeline.push({
          id: localId("TL"),
          at: todayIso(),
          actor: actorName(d),
          actorRole: actorRole(d),
          type: "note",
          title: "Ticket details updated",
          detail: note,
        });
        audit(d, "Ticket updated", t.ref, note ?? Object.keys(patch).join(", "), "info", t.id);
      });
    },
    [mutate],
  );

  const transitionTicket = useCallback<StoreContextValue["transitionTicket"]>(
    (id, to, note, actorOverride) => {
      let ok = false;
      mutate((d) => {
        const t = d.tickets.find((x) => x.id === id);
        if (!t) return;
        const from = t.status;
        if (from === to) return;
        const allowed = TICKET_TRANSITIONS[from] ?? [];
        if (!allowed.includes(to)) return;
        const role = actorRole(d);
        const permitted =
          actorOverride === "system" || canTransition(role, from, to) || rolesForTransition(from, to).includes(role);
        if (!permitted) return;
        t.status = to;
        t.updatedAt = todayIso();
        if (to === "closed") t.closedAt = todayIso();
        t.timeline.push({
          id: localId("TL"),
          at: todayIso(),
          actor: actorName(d, actorOverride === "system" ? "System" : undefined),
          actorRole: actorOverride === "system" ? "system" : actorRole(d),
          type: to === "closed" ? "closure" : "status",
          title: `Status changed to ${to.replace(/_/g, " ")}`,
          detail: note,
          fromStatus: from,
          toStatus: to,
        });
        audit(d, "Status changed", t.ref, `${from} → ${to}${note ? ` — ${note}` : ""}`, to === "escalated" ? "critical" : "info", t.id);
        ok = true;
      });
      return ok;
    },
    [mutate],
  );

  const addTicketNote = useCallback<StoreContextValue["addTicketNote"]>(
    (id, body, visibility) => {
      mutate((d) => {
        const t = d.tickets.find((x) => x.id === id);
        if (!t) return;
        t.notes.unshift({ id: localId("NOTE"), author: actorName(d), body, at: todayIso(), visibility });
        t.timeline.push({
          id: localId("TL"),
          at: todayIso(),
          actor: actorName(d),
          actorRole: actorRole(d),
          type: "note",
          title: visibility === "platform_internal" ? "Platform note added" : "Internal note added",
          detail: body,
        });
      });
    },
    [mutate],
  );

  const assignTicket = useCallback<StoreContextValue["assignTicket"]>(
    (ticketId, engineerId) => {
      mutate((d) => {
        const t = d.tickets.find((x) => x.id === ticketId);
        const eng = d.engineers.find((e) => e.id === engineerId);
        if (!t || !eng) return;
        const now = todayIso();
        // revoke pending offers for this ticket
        d.assignments.forEach((a) => {
          if (a.ticketId === ticketId && a.state === "pending_offer") a.state = "revoked";
        });
        const assignment: Assignment = {
          id: localId("ASG"),
          ticketId,
          engineerId,
          state: "pending_offer",
          assignedBy: actorName(d),
          assignedAt: now,
          responseDeadline: addMinutes(now, d.settings.assignment.offerTimeoutMins),
        };
        d.assignments.push(assignment);
        t.assignedEngineerId = engineerId;
        t.status = "offered";
        t.updatedAt = now;
        t.timeline.push({
          id: localId("TL"),
          at: now,
          actor: actorName(d),
          actorRole: actorRole(d),
          type: "assignment",
          title: `Offered to ${eng.name} (${eng.id})`,
          detail: `Response deadline ${new Date(assignment.responseDeadline).toLocaleString()}.`,
          fromStatus: "awaiting_assignment",
          toStatus: "offered",
        });
        notify(d, {
          title: "Assignment offered to you",
          body: `${t.ref} — ${t.issue.category}, ${t.location.city}. Respond before ${new Date(assignment.responseDeadline).toLocaleTimeString()}.`,
          type: "ticket_assigned",
          audience: ["engineer", "partner_manager"],
          engineerId,
          ticketRef: t.ref,
          channels: ["in_app"],
        });
        audit(d, "Ticket assigned", t.ref, `Offered to ${eng.name} (${eng.id})`, "info", assignment.id);
      });
      toast("Offer sent", { description: "Engineer has been notified with a response deadline." });
    },
    [mutate, toast],
  );

  const respondToOffer = useCallback<StoreContextValue["respondToOffer"]>(
    (ticketId, accept, reason) => {
      mutate((d) => {
        const t = d.tickets.find((x) => x.id === ticketId);
        if (!t) return;
        const engId = t.assignedEngineerId;
        const a = [...d.assignments].reverse().find(
          (x) => x.ticketId === ticketId && x.state === "pending_offer",
        );
        const eng = d.engineers.find((e) => e.id === engId);
        const now = todayIso();
        const role = actorRole(d);
        if (!t || !a) return;
        a.respondedAt = now;
        if (accept) {
          a.state = "accepted";
          t.status = "accepted";
          t.timeline.push({
            id: localId("TL"),
            at: now,
            actor: actorName(d),
            actorRole: role,
            type: "response",
            title: "Assignment accepted",
            detail: "Will contact the customer to agree a visit plan.",
            fromStatus: "offered",
            toStatus: "accepted",
          });
          notify(d, {
            title: "Assignment accepted",
            body: `${t.ref} — ${eng?.name ?? "engineer"} accepted the request.`,
            type: "assignment_accepted",
            audience: ["oem_admin", "oem_service_manager", "oem_service_executive"],
            oemId: t.oemId,
            ticketRef: t.ref,
          });
          audit(d, "Assignment accepted", t.ref, `${eng?.name ?? engId} accepted`, "info", a.id);
        } else {
          a.state = "rejected";
          a.reason = reason ?? "No reason provided";
          t.status = "rejected";
          t.timeline.push({
            id: localId("TL"),
            at: now,
            actor: actorName(d),
            actorRole: role,
            type: "response",
            title: "Assignment rejected",
            detail: `Reason: ${a.reason}. Fallback: ticket returns to the assignment queue.`,
            fromStatus: "offered",
            toStatus: "rejected",
          });
          notify(d, {
            title: "Assignment rejected",
            body: `${t.ref} rejected — ${a.reason}`,
            type: "assignment_rejected",
            audience: ["oem_service_manager", "super_admin", "ops_manager"],
            oemId: t.oemId,
            ticketRef: t.ref,
          });
          audit(d, "Assignment rejected", t.ref, `${eng?.name ?? engId}: ${a.reason}`, "warning", a.id);
          // automatic fallback
          t.timeline.push({
            id: localId("TL"),
            at: now,
            actor: "System",
            actorRole: "system",
            type: "assignment",
            title: "Returned to assignment queue",
            detail: "Rejection does not close the ticket — fallback path engaged.",
            fromStatus: "rejected",
            toStatus: "awaiting_assignment",
          });
          t.status = "awaiting_assignment";
          t.assignedEngineerId = undefined;
        }
        t.updatedAt = now;
      });
      toast(accept ? "Offer accepted" : "Offer declined", {
        description: accept ? "Next step: contact the customer and schedule the visit." : "Ticket returned to the assignment queue.",
        tone: accept ? "success" : "info",
      });
    },
    [mutate, toast],
  );

  const revokeOffer = useCallback<StoreContextValue["revokeOffer"]>(
    (assignmentId) => {
      mutate((d) => {
        const a = d.assignments.find((x) => x.id === assignmentId);
        if (!a) return;
        a.state = "revoked";
        const t = d.tickets.find((x) => x.id === a.ticketId);
        if (t && t.status === "offered") {
          t.status = "awaiting_assignment";
          t.assignedEngineerId = undefined;
          t.updatedAt = todayIso();
          t.timeline.push({
            id: localId("TL"),
            at: todayIso(),
            actor: actorName(d),
            actorRole: actorRole(d),
            type: "assignment",
            title: "Offer revoked",
            detail: "Returned to the assignment queue.",
            fromStatus: "offered",
            toStatus: "awaiting_assignment",
          });
        }
        audit(d, "Offer revoked", t?.ref ?? assignmentId, undefined, "warning", a.id);
      });
      toast("Offer revoked", { tone: "info" });
    },
    [mutate, toast],
  );

  const markCustomerContacted = useCallback<StoreContextValue["markCustomerContacted"]>(
    (ticketId, note) => {
      mutate((d) => {
        const t = d.tickets.find((x) => x.id === ticketId);
        if (!t) return;
        const now = todayIso();
        t.status = "contact_pending";
        t.updatedAt = now;
        const visit = d.visits.find((v) => v.ticketId === ticketId && v.status === "scheduled");
        if (visit) visit.customerContactedAt = now;
        t.timeline.push({
          id: localId("TL"),
          at: now,
          actor: actorName(d),
          actorRole: actorRole(d),
          type: "contact",
          title: "Customer contacted",
          detail: note ?? "Contact attempt recorded.",
          fromStatus: t.status,
          toStatus: "contact_pending",
        });
        notify(d, {
          title: "Customer contact pending",
          body: `${t.ref} — engineer has initiated customer contact.`,
          type: "contact_pending",
          audience: ["oem_service_manager", "oem_service_executive"],
          oemId: t.oemId,
          ticketRef: t.ref,
        });
      });
      toast("Contact recorded");
    },
    [mutate, toast],
  );

  const scheduleVisit = useCallback<StoreContextValue["scheduleVisit"]>(
    (ticketId, engineerId, scheduledFor, slot, notes) => {
      mutate((d) => {
        const t = d.tickets.find((x) => x.id === ticketId);
        if (!t) return;
        const now = todayIso();
        d.visits.forEach((v) => {
          if (v.ticketId === ticketId && (v.status === "scheduled" || v.status === "rescheduled")) {
            v.status = "rescheduled";
          }
        });
        const visit: Visit = {
          id: localId("VIS"),
          ticketId,
          engineerId,
          scheduledFor,
          slot,
          status: "scheduled",
          notes,
          customerContactedAt: now,
          evidence: [],
        };
        d.visits.push(visit);
        t.status = "visit_scheduled";
        t.updatedAt = now;
        t.timeline.push({
          id: localId("TL"),
          at: now,
          actor: actorName(d),
          actorRole: actorRole(d),
          type: "visit",
          title: `Visit scheduled for ${new Date(scheduledFor).toLocaleDateString()} , ${slot}`,
          detail: notes,
          fromStatus: t.status,
          toStatus: "visit_scheduled",
        });
        notify(d, {
          title: "Visit scheduled",
          body: `${t.ref} — visit on ${new Date(scheduledFor).toLocaleDateString()} (${slot}).`,
          type: "visit_scheduled",
          audience: ["engineer", "partner_manager", "oem_service_manager"],
          engineerId,
          oemId: t.oemId,
          ticketRef: t.ref,
          channels: ["in_app"],
        });
        audit(d, "Visit scheduled", t.ref, `${new Date(scheduledFor).toLocaleDateString()} ${slot}`, "info", visit.id);
      });
      toast("Visit scheduled", { description: "Customer and engineer have been notified (demo)." });
    },
    [mutate, toast],
  );

  const updateVisit = useCallback<StoreContextValue["updateVisit"]>(
    (visitId, status, reason) => {
      mutate((d) => {
        const v = d.visits.find((x) => x.id === visitId);
        if (!v) return;
        const t = d.tickets.find((x) => x.id === v.ticketId);
        const now = todayIso();
        v.status = status;
        v.reason = reason;
        if (status === "completed") v.completedAt = now;
        if (status === "cancelled" || status === "failed" || status === "customer_unavailable") {
          v.reason = reason ?? "Reason not provided";
        }
        if (t) {
          t.updatedAt = now;
          if (status === "completed") {
            t.timeline.push({
              id: localId("TL"), at: now, actor: actorName(d), actorRole: actorRole(d),
              type: "visit", title: "Visit completed", detail: reason,
              fromStatus: "in_progress", toStatus: "report_submitted",
            });
          } else if (status === "in_progress") {
            t.status = "in_progress";
            t.timeline.push({
              id: localId("TL"), at: now, actor: actorName(d), actorRole: actorRole(d),
              type: "visit", title: "Visit started on site", detail: reason,
              fromStatus: "visit_scheduled", toStatus: "in_progress",
            });
          } else if (status === "cancelled" || status === "failed" || status === "customer_unavailable") {
            t.status = "contact_pending";
            t.timeline.push({
              id: localId("TL"), at: now, actor: actorName(d), actorRole: actorRole(d),
              type: "visit",
              title: status === "customer_unavailable" ? "Customer unavailable" : status === "failed" ? "Failed visit" : "Visit cancelled",
              detail: v.reason,
              fromStatus: "visit_scheduled", toStatus: "contact_pending",
            });
            notify(d, {
              title: "Visit needs re-planning",
              body: `${t.ref} — ${v.reason}`,
              type: "visit_rescheduled",
              audience: ["oem_service_manager", "ops_manager"],
              oemId: t.oemId, ticketRef: t.ref,
            });
          } else if (status === "rescheduled") {
            t.status = "visit_scheduled";
            t.timeline.push({
              id: localId("TL"), at: now, actor: actorName(d), actorRole: actorRole(d),
              type: "visit", title: "Visit rescheduled", detail: v.reason,
              fromStatus: "visit_scheduled", toStatus: "visit_scheduled",
            });
          }
        }
        audit(d, "Visit updated", t?.ref ?? visitId, `${status}${reason ? ` — ${reason}` : ""}`, "info", visitId);
      });
      toast("Visit updated", { tone: "info" });
    },
    [mutate, toast],
  );

  const startVisit = useCallback<StoreContextValue["startVisit"]>(
    (visitId) => {
      mutate((d) => {
        const v = d.visits.find((x) => x.id === visitId);
        if (!v) return;
        const t = d.tickets.find((x) => x.id === v.ticketId);
        const now = todayIso();
        v.status = "in_progress";
        v.startedAt = now;
        if (t) {
          t.status = "in_progress";
          t.updatedAt = now;
          t.timeline.push({
            id: localId("TL"), at: now, actor: actorName(d), actorRole: actorRole(d),
            type: "visit", title: "Visit started on site", detail: "Arrival confirmed.",
            fromStatus: "visit_scheduled", toStatus: "in_progress",
          });
        }
        audit(d, "Visit started", t?.ref ?? visitId, undefined, "info", visitId);
      });
      toast("Visit started", { description: "Inspection checklist is now available." });
    },
    [mutate, toast],
  );

  const submitReport = useCallback<StoreContextValue["submitReport"]>(
    (ticketId, body) => {
      mutate((d) => {
        const t = d.tickets.find((x) => x.id === ticketId);
        if (!t) return;
        const now = todayIso();
        const existing = d.reports.find((r) => r.ticketId === ticketId && (r.status === "draft" || r.status === "clarification_requested" || r.status === "submitted"));
        const evidence = body.evidenceNames.map((name) => ({
          id: localId("ATT"), name, kind: "image" as const, sizeKb: 640 + Math.floor(Math.random() * 700),
          uploadedBy: actorName(d), uploadedAt: now,
        }));
        if (existing) {
          Object.assign(existing, {
            inspectionFindings: body.inspectionFindings,
            diagnosis: body.diagnosis,
            workPerformed: body.workPerformed,
            partsUsed: body.partsUsed,
            errorCodes: body.errorCodes,
            recommendations: body.recommendations,
            followUpRequired: body.followUpRequired,
            safetyObservations: body.safetyObservations,
            customerAcknowledged: body.customerAcknowledged,
            submittedAt: now,
            status: "submitted" as const,
            evidence: [...existing.evidence, ...evidence],
            reviewRemark: undefined,
            reviewedAt: undefined,
            reviewedBy: undefined,
          });
          t.reportId = existing.id;
        } else {
          const report: ServiceReport = {
            id: localId("RPT"),
            ticketId,
            engineerId: t.assignedEngineerId ?? "ENG-01",
            submittedAt: now,
            status: "submitted",
            inspectionFindings: body.inspectionFindings,
            diagnosis: body.diagnosis,
            workPerformed: body.workPerformed,
            partsUsed: body.partsUsed,
            errorCodes: body.errorCodes,
            recommendations: body.recommendations,
            followUpRequired: body.followUpRequired,
            safetyObservations: body.safetyObservations,
            customerAcknowledged: body.customerAcknowledged,
            evidence,
          };
          d.reports.push(report);
          t.reportId = report.id;
        }
        t.status = "awaiting_oem_review";
        t.updatedAt = now;
        t.timeline.push({
          id: localId("TL"), at: now, actor: actorName(d), actorRole: actorRole(d),
          type: "report", title: "Service report submitted", detail: "Findings, work performed and evidence attached.",
          fromStatus: "report_submitted", toStatus: "awaiting_oem_review",
        });
        notify(d, {
          title: "Service report submitted",
          body: `${t.ref} — report awaiting your review.`,
          type: "report_submitted",
          audience: ["oem_admin", "oem_service_manager", "oem_service_executive"],
          oemId: t.oemId, ticketRef: t.ref,
        });
        audit(d, "Service report submitted", t.ref, undefined, "info", t.reportId);
      });
      toast("Report submitted", { description: "OEM review is now pending." });
    },
    [mutate, toast],
  );

  const reviewReport = useCallback<StoreContextValue["reviewReport"]>(
    (reportId, decision, remark) => {
      mutate((d) => {
        const r = d.reports.find((x) => x.id === reportId);
        if (!r) return;
        const t = d.tickets.find((x) => x.id === r.ticketId);
        const now = todayIso();
        r.status = decision;
        r.reviewRemark = remark;
        r.reviewedBy = actorName(d);
        r.reviewedAt = now;
        if (!t) return;
        if (decision === "approved") {
          t.status = "completed";
          t.timeline.push({
            id: localId("TL"), at: now, actor: actorName(d), actorRole: actorRole(d),
            type: "review", title: "Report approved — ticket completed",
            detail: remark || "Evidence complete.", fromStatus: "awaiting_oem_review", toStatus: "completed",
          });
          notify(d, {
            title: "Report approved", body: `${t.ref} — report approved, ticket completed.`,
            type: "ticket_completed", audience: ["engineer", "partner_manager"],
            engineerId: r.engineerId, ticketRef: t.ref,
          });
        } else if (decision === "clarification_requested") {
          t.status = "clarification_required";
          t.timeline.push({
            id: localId("TL"), at: now, actor: actorName(d), actorRole: actorRole(d),
            type: "review", title: "Clarification requested", detail: remark,
            fromStatus: "awaiting_oem_review", toStatus: "clarification_required",
          });
          notify(d, {
            title: "Clarification requested", body: `${t.ref} — ${remark}`,
            type: "clarification_requested", audience: ["engineer", "partner_manager"],
            engineerId: r.engineerId, ticketRef: t.ref,
          });
        } else {
          t.status = "clarification_required";
          t.timeline.push({
            id: localId("TL"), at: now, actor: actorName(d), actorRole: actorRole(d),
            type: "review", title: "Report rejected", detail: remark,
            fromStatus: "awaiting_oem_review", toStatus: "clarification_required",
          });
        }
        t.updatedAt = now;
        audit(d, "Service report reviewed", t.ref, `${decision} — ${remark}`, decision === "approved" ? "info" : "warning", r.id);
      });
      toast(
        decision === "approved" ? "Report approved" : decision === "clarification_requested" ? "Clarification requested" : "Report rejected",
        { tone: decision === "approved" ? "success" : "info" },
      );
    },
    [mutate, toast],
  );

  const raiseEscalation = useCallback<StoreContextValue["raiseEscalation"]>(
    (ticketId, reason, target) => {
      mutate((d) => {
        const t = d.tickets.find((x) => x.id === ticketId);
        if (!t) return;
        const now = todayIso();
        const esc: Escalation = {
          id: localId("ESC"),
          ticketId,
          level: target === "oem_senior" ? 2 : 1,
          raisedBy: actorName(d),
          raisedAt: now,
          reason,
          target,
          status: "open",
        };
        d.escalations.unshift(esc);
        t.escalationIds.push(esc.id);
        t.status = "escalated";
        t.updatedAt = now;
        t.timeline.push({
          id: localId("TL"), at: now, actor: actorName(d), actorRole: actorRole(d),
          type: "escalation", title: `Escalated (${target.replace("_", " ")})`, detail: reason,
          fromStatus: t.status, toStatus: "escalated",
        });
        notify(d, {
          title: `Escalation opened — level ${esc.level}`, body: `${t.ref} — ${reason}`,
          type: "ticket_escalated", oemId: t.oemId, ticketRef: t.ref,
          audience: ["oem_admin", "oem_service_manager", "super_admin", "ops_manager"],
        });
        audit(d, "Escalation opened", t.ref, reason, "critical", esc.id);
      });
      toast("Escalation raised", { tone: "info" });
    },
    [mutate, toast],
  );

  const resolveEscalation = useCallback<StoreContextValue["resolveEscalation"]>(
    (escalationId, resolution) => {
      mutate((d) => {
        const e = d.escalations.find((x) => x.id === escalationId);
        if (!e) return;
        e.status = "resolved";
        e.resolution = resolution;
        const t = d.tickets.find((x) => x.id === e.ticketId);
        if (t) {
          t.timeline.push({
            id: localId("TL"), at: todayIso(), actor: actorName(d), actorRole: actorRole(d),
            type: "escalation", title: "Escalation resolved", detail: resolution,
          });
          t.updatedAt = todayIso();
        }
        audit(d, "Escalation resolved", t?.ref ?? escalationId, resolution, "info", escalationId);
      });
      toast("Escalation resolved");
    },
    [mutate, toast],
  );

  const closeTicket = useCallback<StoreContextValue["closeTicket"]>(
    (ticketId) => {
      const ok = transitionTicket(ticketId, "closed", "Closure rule met: report approved + OEM review complete.");
      if (ok) toast("Ticket closed");
      else toast("Closure not allowed", { description: "Ticket must be Completed before closing.", tone: "error" });
    },
    [transitionTicket, toast],
  );

  /* ---------------- inverter repair service requests ---------------- */

  const createRepairRequest = useCallback<StoreContextValue["createRepairRequest"]>(
    (input) => {
      const company = state.partners.find((p) => p.id === input.companyId);
      const errors = validateRepairRequest(input, company);
      if (Object.keys(errors).length > 0) return { ok: false, errors };

      // Authorization: a request can only be raised by a signed-in customer,
      // and only on behalf of themselves.
      const activeCustomerId = state.portalCustomerId;
      const ownsSession = activeCustomerId
        ? activeCustomerId === input.customerId
        : state.portalCustomerIds.includes(input.customerId);
      if (!ownsSession) {
        return {
          ok: false,
          errors: { customerId: "Sign in to raise a repair request." },
        };
      }
      if (!company) {
        return { ok: false, errors: { companyId: "Select a repair company." } };
      }

      const holder: { request?: RepairRequest } = {};
      mutate((d) => {
        const now = todayIso();
        const seqNo = d.repairRequests.reduce((max, r) => {
          const num = Number(r.ref.split("-").pop());
          return Number.isFinite(num) ? Math.max(max, num) : max;
        }, 0);
        const customer = d.customers.find((c) => c.id === input.customerId);
        const request: RepairRequest = {
          id: localId("RPR"),
          ref: nextRepairRef(seqNo + 1),
          customerId: input.customerId,
          companyId: input.companyId,
          createdAt: now,
          updatedAt: now,
          status: "pending",
          contact: {
            name: input.contactName.trim(),
            phone: input.contactPhone.trim(),
            company: input.contactCompany?.trim() || undefined,
            email: input.contactEmail?.trim() || undefined,
            address: input.address.trim(),
            city: input.city.trim(),
            state: input.state?.trim() || customer?.state || "",
            pincode: input.pincode?.trim() || customer?.pincode || "",
          },
          inverter: {
            productType: input.productType ?? "inverter",
            brand: input.brand.trim(),
            model: input.model?.trim() || undefined,
            capacityKw: input.capacityKw,
            category: input.category,
            serialNumber: input.serialNumber?.trim() || undefined,
            yearOfInstallation: input.yearOfInstallation?.trim() || undefined,
          },
          problem: {
            category: input.problemCategory.trim(),
            description: input.description.trim(),
            errorCode: input.errorCode?.trim() || undefined,
          },
          serviceMode: input.serviceMode,
          preferredDate: input.preferredDate,
          attachment: input.attachmentName
            ? {
                id: localId("ATT"),
                name: input.attachmentName,
                kind: "image",
                sizeKb: 420 + (input.attachmentName.length % 900),
                uploadedAt: now,
              }
            : undefined,
          timeline: [
            {
              id: localId("TL"),
              at: now,
              actor: customer?.name ?? input.contactName.trim(),
              actorRole: "customer",
              type: "created",
              title: "Repair request raised",
              detail: `${REPAIR_PRODUCT_TYPE_LABELS[input.productType ?? "inverter"] ?? "Equipment"} · ${input.brand.trim()} — ${input.problemCategory.trim()}`,
              toStatus: "pending",
            },
          ],
          createdBy: input.customerId,
        };
        d.repairRequests.unshift(request);
        holder.request = request;
        const productLabel =
          REPAIR_PRODUCT_TYPE_LABELS[request.inverter.productType ?? "inverter"] ?? "Equipment";
        audit(
          d,
          "Repair request created",
          request.ref,
          `${company.name} · ${productLabel} · ${request.inverter.brand} · ${request.problem.category}`,
          "info",
          request.id,
        );
        notify(d, {
          title: "New repair request",
          body: `${request.ref} — ${request.problem.category} for ${productLabel} ${request.inverter.brand} ${request.inverter.model ?? ""} in ${request.contact.city}.`,
          type: "repair_request_created",
          audience: ["partner_manager", "super_admin", "ops_manager"],
          ticketRef: request.ref,
        });
      });

      if (!holder.request) return { ok: false, errors: { description: "Could not create the request." } };
      return { ok: true, request: holder.request };
    },
    [mutate, state.partners, state.portalCustomerId, state.portalCustomerIds],
  );

  const respondToRepairRequest = useCallback<StoreContextValue["respondToRepairRequest"]>(
    (id, decision, note) => {
      let ok = false;
      mutate((d) => {
        const request = d.repairRequests.find((r) => r.id === id);
        if (!request) return;
        const role = actorRole(d);
        const user = d.users.find((u) => u.id === d.currentUserId);
        // Authorization: only the repair company that owns the request (or a
        // platform admin) may respond to it.
        const permitted =
          (role !== "system" && REPAIR_ADMIN_ROLES.includes(role)) ||
          (role === "partner_manager" && user?.partnerId === request.companyId);
        if (!permitted) return;

        const to: RepairRequestStatus = decision === "accepted" ? "accepted" : "rejected";
        const allowed = REPAIR_REQUEST_TRANSITIONS[request.status] ?? [];
        if (!allowed.includes(to)) return;
        if (to === "rejected" && !note?.trim()) return;

        const now = todayIso();
        const company = d.partners.find((p) => p.id === request.companyId);
        request.status = to;
        request.updatedAt = now;
        if (to === "accepted") request.companyNote = note?.trim() || undefined;
        if (to === "rejected") request.rejectionReason = note?.trim();
        request.timeline.push({
          id: localId("TL"),
          at: now,
          actor: actorName(d),
          actorRole: role,
          type: "status",
          title:
            to === "accepted"
              ? `Request accepted by ${company?.name ?? "the repair company"}`
              : `Request declined by ${company?.name ?? "the repair company"}`,
          detail: note?.trim() || undefined,
          fromStatus: "pending",
          toStatus: to,
        });
        audit(
          d,
          to === "accepted" ? "Repair request accepted" : "Repair request rejected",
          request.ref,
          note?.trim() || company?.name,
          to === "accepted" ? "info" : "warning",
          request.id,
        );
        notify(d, {
          title: to === "accepted" ? "Repair request accepted" : "Repair request declined",
          body: `${request.ref} — ${company?.name ?? "Repair company"} ${to} the request.`,
          type: to === "accepted" ? "repair_request_accepted" : "repair_request_rejected",
          audience: ["super_admin", "ops_manager", "support_executive"],
          ticketRef: request.ref,
        });
        ok = true;
      });
      return ok;
    },
    [mutate],
  );

  const setRepairRequestStatus = useCallback<StoreContextValue["setRepairRequestStatus"]>(
    (id, to, note) => {
      let ok = false;
      mutate((d) => {
        const request = d.repairRequests.find((r) => r.id === id);
        if (!request) return;
        const role = actorRole(d);
        const user = d.users.find((u) => u.id === d.currentUserId);
        const isAdmin = role !== "system" && REPAIR_ADMIN_ROLES.includes(role);
        const permitted =
          isAdmin || (role === "partner_manager" && user?.partnerId === request.companyId);
        if (!permitted) return;

        const allowed = REPAIR_REQUEST_TRANSITIONS[request.status] ?? [];
        if (!allowed.includes(to)) return;
        if (!isAdmin && !canRepairTransition(role, request.status, to)) return;

        const now = todayIso();
        const from = request.status;
        request.status = to;
        request.updatedAt = now;
        if (to === "completed") request.completedAt = now;
        request.timeline.push({
          id: localId("TL"),
          at: now,
          actor: actorName(d),
          actorRole: role,
          type: to === "completed" ? "closure" : "status",
          title:
            to === "completed"
              ? "Repair completed"
              : `Status changed to ${to.replace(/_/g, " ")}`,
          detail: note?.trim() || undefined,
          fromStatus: from,
          toStatus: to,
        });
        audit(
          d,
          "Repair status changed",
          request.ref,
          `${from} → ${to}${note ? ` — ${note}` : ""}`,
          to === "completed" ? "info" : "info",
          request.id,
        );
        notify(d, {
          title: "Repair request updated",
          body: `${request.ref} — now ${to.replace(/_/g, " ")}.`,
          type: "repair_request_updated",
          audience: ["super_admin", "ops_manager", "support_executive"],
          ticketRef: request.ref,
        });
        ok = true;
      });
      return ok;
    },
    [mutate],
  );

  const setRepairCompanyStatus = useCallback<StoreContextValue["setRepairCompanyStatus"]>(
    (companyId, status, note) => {
      let applied = false;
      mutate((d) => {
        const partner = d.partners.find((p) => p.id === companyId);
        if (!partner) return;
        const role = actorRole(d);
        if (role === "system" || !REPAIR_ADMIN_ROLES.includes(role)) return;
        partner.status = status;
        audit(
          d,
          `Repair company ${status}`,
          partner.name,
          note,
          status === "inactive" ? "warning" : "info",
          partner.id,
        );
        notify(d, {
          title: `Repair company ${status}`,
          body: `${partner.name} — ${note ?? "directory status updated by the platform team."}`,
          type: "system",
          audience: ["super_admin", "ops_manager"],
        });
        applied = true;
      });
      if (applied) {
        toast("Repair company updated", { tone: "info" });
      } else {
        toast("Not allowed", {
          description: "Only a platform admin can manage the repair directory.",
          tone: "error",
        });
      }
      return applied;
    },
    [mutate, toast],
  );

  const addRepairCompany = useCallback<StoreContextValue["addRepairCompany"]>(
    (input) => {
      const maxN = state.partners.reduce((m, p) => {
        const n = Number(p.id.replace(/\D/g, ""));
        return Number.isFinite(n) && p.id.startsWith("SP-") ? Math.max(m, n) : m;
      }, 0);
      const company: ServicePartner = {
        ...input,
        id: `SP-${String(maxN + 1).padStart(2, "0")}`,
        since: input.since ?? todayIso().slice(0, 10),
        status: input.status ?? "active",
        rating: input.rating ?? 0,
        repairSpecialities: input.repairSpecialities ?? [],
        brandsServiced: input.brandsServiced ?? [],
        serviceModes: input.serviceModes ?? ["on_site"],
        avgTurnaround: input.avgTurnaround ?? "—",
        jobsCompleted: input.jobsCompleted ?? 0,
      };
      mutate((d) => {
        d.partners.push(company);
        audit(d, "Repair company registered", company.name, company.city, "info", company.id);
        notify(d, {
          title: "New repair company registered",
          body: `${company.name} — ${company.city}. Visible to customers in the repair directory.`,
          type: "system",
          audience: ["super_admin", "ops_manager"],
        });
      });
      toast("Repair company registered", {
        description: "Your company is now listed in the public repair directory.",
      });
      return company;
    },
    [mutate, toast, state.partners],
  );

  const setRepairCompanyLogo = useCallback<StoreContextValue["setRepairCompanyLogo"]>(
    (companyId, logoUrl) => {
      let applied = false;
      mutate((d) => {
        const partner = d.partners.find((p) => p.id === companyId);
        if (!partner) return;
        partner.logoUrl = logoUrl;
        audit(d, "Company logo updated", partner.name, undefined, "info", partner.id);
        applied = true;
      });
      if (applied) toast("Company logo saved");
      return applied;
    },
    [mutate, toast],
  );

  /* ---------------- engineers ---------------- */

  const setEngineerVerification = useCallback<StoreContextValue["setEngineerVerification"]>(
    (engineerId, status, note) => {
      mutate((d) => {
        const e = d.engineers.find((x) => x.id === engineerId);
        if (!e) return;
        e.verification = status;
        e.status = status === "approved" ? "active" : status === "rejected" ? "inactive" : e.status;
        if (note) e.onboardingNotes = note;
        if (status === "approved") {
          e.documents = e.documents.map((doc) => ({ ...doc, status: "verified" as const }));
          e.bankDetailsProvided = true;
        }
        e.documents = e.documents.map((doc) =>
          status === "more_info_required" && doc.status === "missing" ? doc : doc,
        );
        audit(
          d,
          `Engineer ${status.replace("_", " ")}`,
          `${e.name} (${e.id})`,
          note,
          status === "approved" ? "info" : status === "rejected" ? "warning" : "info",
          e.id,
        );
        notify(d, {
          title: `Engineer ${status.replace("_", " ")}`,
          body: `${e.name} — ${note ?? "verification update"}.`,
          type: "engineer_verification",
          audience: ["super_admin", "ops_manager"],
        });
      });
      toast(`Engineer ${status.replace("_", " ")}`, { tone: status === "rejected" ? "info" : "success" });
    },
    [mutate, toast],
  );

  const setEngineerStatus = useCallback<StoreContextValue["setEngineerStatus"]>(
    (engineerId, status, note) => {
      mutate((d) => {
        const e = d.engineers.find((x) => x.id === engineerId);
        if (!e) return;
        e.status = status;
        if (note) e.onboardingNotes = note;
        audit(d, `Engineer ${status}`, `${e.name} (${e.id})`, note, status === "suspended" ? "warning" : "info", e.id);
      });
      toast(`Engineer marked ${status}`, { tone: status === "suspended" ? "info" : "success" });
    },
    [mutate, toast],
  );

  const updateEngineer = useCallback<StoreContextValue["updateEngineer"]>(
    (engineerId, patch) => {
      mutate((d) => {
        const e = d.engineers.find((x) => x.id === engineerId);
        if (!e) return;
        Object.assign(e, patch);
        audit(d, "Engineer profile updated", `${e.name} (${e.id})`, Object.keys(patch).join(", "), "info", e.id);
      });
      toast("Profile saved");
    },
    [mutate, toast],
  );

  const updateCustomer = useCallback<StoreContextValue["updateCustomer"]>(
    (customerId, patch) => {
      mutate((d) => {
        const c = d.customers.find((x) => x.id === customerId);
        if (!c) return;
        Object.assign(c, patch);
        audit(d, "Customer profile updated", `${c.name} (${c.id})`, Object.keys(patch).join(", "), "info", c.id);
      });
      toast("Profile saved");
    },
    [mutate, toast],
  );

  const addEngineer = useCallback<StoreContextValue["addEngineer"]>(
    (input) => {
      mutate((d) => {
        const maxN = d.engineers.reduce((m, e) => {
          const n = Number(e.id.replace(/\D/g, ""));
          return Number.isFinite(n) && e.id.startsWith("ENG-") ? Math.max(m, n) : m;
        }, 0);
        const id = `ENG-${String(maxN + 1).padStart(2, "0")}`;
        const engineer: Engineer = {
          id,
          partnerId: input.partnerId ?? null,
          name: input.name,
          phone: input.phone ?? "—",
          email: input.email ?? "—",
          city: input.city ?? "—",
          state: input.state ?? "—",
          pincode: input.pincode ?? "—",
          address: input.address ?? "",
          serviceRadiusKm: input.serviceRadiusKm ?? 30,
          skills: input.skills ?? [],
          productExpertise: input.productExpertise ?? [],
          certifications: input.certifications ?? [],
          experienceYears: input.experienceYears ?? 1,
          languages: input.languages ?? ["Hindi", "English"],
          status: "pending",
          verification: "submitted",
          exclusiveOemId: input.exclusiveOemId ?? null,
          availability: "available",
          currentLoad: 0,
          maxLoad: input.maxLoad ?? 3,
          rating: 0,
          completedJobs: 0,
          acceptanceRate: 100,
          rejectionRate: 0,
          avgResponseMins: 30,
          reportQualityScore: 0,
          onboardingStep: input.onboardingStep ?? 5,
          documents: input.documents ?? [],
          bankDetailsProvided: input.bankDetailsProvided ?? false,
          joinedAt: todayIso(),
        };
        d.engineers.push(engineer);
        audit(
          d,
          "Engineer onboarded",
          `${engineer.name} (${engineer.id})`,
          engineer.city ? `${engineer.city}, ${engineer.state}` : undefined,
          "info",
          engineer.id,
        );
      });
      toast("Engineer submitted for verification", {
        description: "The RAYVIQ verification desk will review the documents shortly.",
      });
    },
    [mutate, toast],
  );

  /* ---------------- oems ---------------- */

  const updateOem = useCallback<StoreContextValue["updateOem"]>(
    (oemId, patch) => {
      mutate((d) => {
        const o = d.oems.find((x) => x.id === oemId);
        if (!o) return;
        Object.assign(o, patch);
        audit(d, "OEM configuration changed", o.name, Object.keys(patch).join(", "), "info", o.id);
      });
      toast("OEM updated");
    },
    [mutate, toast],
  );

  const addOem = useCallback<StoreContextValue["addOem"]>(
    (input) => {
      mutate((d) => {
        const id = `OEM-${String(d.oems.length + 1).padStart(3, "0")}`;
        const oem: Oem = {
          id,
          name: input.name,
          shortName: input.shortName ?? input.name.split(" ")[0] ?? "New OEM",
          status: input.status ?? "onboarding",
          industry: input.industry ?? "Solar inverter manufacturing",
          hqCity: input.hqCity ?? "—",
          hqState: input.hqState ?? "—",
          contactName: input.contactName ?? "—",
          contactEmail: input.contactEmail ?? "—",
          contactPhone: input.contactPhone ?? "—",
          planId: input.planId ?? "PLAN-01",
          subscriptionStatus: input.subscriptionStatus ?? "trial",
          seats: input.seats ?? 10,
          serviceRegions: input.serviceRegions ?? [],
          productCategories: input.productCategories ?? [],
          goLiveDate: input.goLiveDate ?? todayIso().slice(0, 10),
          logoColor: "#2554e0",
          createdAt: todayIso(),
        };
        d.oems.push(oem);
        audit(d, "OEM created", oem.name, undefined, "info", oem.id);
      });
      toast("OEM added");
    },
    [mutate, toast],
  );

  /* ---------------- platform ---------------- */

  const updateSettings = useCallback<StoreContextValue["updateSettings"]>(
    (patch) => {
      mutate((d) => {
        d.settings = { ...d.settings, ...patch };
        audit(d, "Platform settings updated", Object.keys(patch).join(", "), undefined, "info");
      });
      toast("Settings saved");
    },
    [mutate, toast],
  );

  const toggleIntegration = useCallback<StoreContextValue["toggleIntegration"]>(
    (id) => {
      mutate((d) => {
        const i = d.integrations.find((x) => x.id === id);
        if (!i) return;
        if (i.state === "not_connected" || i.state === "error") {
          i.state = "demo";
          i.errorNote = undefined;
          i.lastSyncAt = todayIso();
        } else if (i.state === "demo" || i.state === "configured") {
          i.state = "disabled";
        } else {
          i.state = "not_connected";
        }
        audit(d, "Integration state changed", i.name, i.state, "info", i.id);
      });
      toast("Integration updated", { tone: "info" });
    },
    [mutate, toast],
  );

  const markNotificationRead = useCallback<StoreContextValue["markNotificationRead"]>(
    (id) => {
      mutate((d) => {
        const n = d.notifications.find((x) => x.id === id);
        const uid = d.currentUserId ?? "USR-08";
        if (n && !n.readBy.includes(uid)) n.readBy.push(uid);
      });
    },
    [mutate],
  );

  const markAllNotificationsRead = useCallback(() => {
    mutate((d) => {
      const uid = d.currentUserId ?? "USR-08";
      d.notifications.forEach((n) => {
        if (!n.readBy.includes(uid)) n.readBy.push(uid);
      });
    });
    toast("All notifications marked as read");
  }, [mutate, toast]);

  const clearNotifications = useCallback(() => {
    mutate((d) => {
      d.notifications = [];
    });
    toast("Notification centre cleared", { tone: "info" });
  }, [mutate, toast]);

  const portalLogin = useCallback((customerId: string) => {
    mutate((d) => {
      if (!d.portalCustomerIds.includes(customerId)) d.portalCustomerIds.push(customerId);
      /* The client app acts as one customer at a time — remember which. */
      d.portalCustomerId = customerId;
    });
  }, [mutate]);

  const portalLogout = useCallback(() => {
    mutate((d) => {
      d.portalCustomerIds = [];
      d.portalCustomerId = null;
    });
  }, [mutate]);

  const registerCustomer = useCallback<StoreContextValue["registerCustomer"]>(
    (input) => {
      const holder: { customer?: Customer } = {};
      mutate((d) => {
        const maxN = d.customers.reduce((m, c) => {
          const n = Number(c.id.replace(/\D/g, ""));
          return Number.isFinite(n) && c.id.startsWith("CUS-") ? Math.max(m, n) : m;
        }, 0);
        const customer: Customer = {
          id: `CUS-${String(maxN + 1).padStart(3, "0")}`,
          name: input.name,
          phone: input.phone,
          email: input.email || undefined,
          company: input.company || undefined,
          type: input.type ?? "end_customer",
          city: input.city,
          state: input.state ?? "",
          pincode: input.pincode ?? "",
          createdAt: todayIso(),
        };
        d.customers.push(customer);
        if (!d.portalCustomerIds.includes(customer.id)) d.portalCustomerIds.push(customer.id);
        d.portalCustomerId = customer.id;
        audit(
          d,
          "Customer account created",
          `${customer.name} (${customer.id})`,
          `${customer.city}${customer.email ? ` · ${customer.email}` : ""}`,
          "info",
          customer.id,
        );
        notify(d, {
          title: "New customer registered",
          body: `${customer.name} signed up from the client app.`,
          type: "system",
          audience: ["super_admin", "ops_manager", "support_executive"],
        });
        holder.customer = customer;
      });
      if (!holder.customer) throw new Error("Customer registration failed");
      return holder.customer;
    },
    [mutate],
  );

  const value: StoreContextValue = {
    state,
    ready,
    currentUser,
    effectiveRole,
    login,
    loginRemoteUser,
    logout,
    setRoleOverride,
    toasts,
    toast,
    dismissToast,
    createTicket,
    updateTicket,
    transitionTicket,
    addTicketNote,
    assignTicket,
    respondToOffer,
    revokeOffer,
    markCustomerContacted,
    scheduleVisit,
    updateVisit,
    startVisit,
    submitReport,
    reviewReport,
    raiseEscalation,
    resolveEscalation,
    closeTicket,
    createRepairRequest,
    respondToRepairRequest,
    setRepairRequestStatus,
    setRepairCompanyStatus,
    addRepairCompany,
    setRepairCompanyLogo,
    setEngineerVerification,
    setEngineerStatus,
    updateEngineer,
    updateCustomer,
    addEngineer,
    updateOem,
    addOem,
    updateSettings,
    toggleIntegration,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    portalLogin,
    portalLogout,
    registerCustomer,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/* Convenience selectors used across pages */

export function useMyOemId(): string | null {
  const { currentUser, state, effectiveRole } = useStore();
  if (currentUser?.oemId) return currentUser.oemId;
  const firstOem = state.oems[0];
  const isOemRole = ["oem_admin", "oem_service_manager", "oem_service_executive"].includes(effectiveRole);
  return isOemRole ? firstOem?.id ?? null : null;
}

export function unreadCount(state: AppState): number {
  const uid = state.currentUserId ?? "USR-08";
  return state.notifications.filter((n) => !n.readBy.includes(uid)).length;
}

export type {
  AmcContract,
  AppState,
  Assignment,
  Customer,
  DemoUser,
  Engineer,
  Equipment,
  Integration,
  MaintenanceVisit,
  Oem,
  RepairRequest,
  ServicePartner,
  ServiceReport,
  Site,
  SubscriptionPlan,
  OrganisationSubscription,
  Ticket,
  Visit,
};
