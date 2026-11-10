import type { Portal, Role } from "./types";
import { ROLE_PORTAL } from "./constants";

/**
 * UI-level permission matrix.
 *
 * IMPORTANT: this is a demonstration convenience only. Real enforcement must
 * live on the backend; client-side checks never provide security.
 */
export type Permission =
  /* OEM workspace */
  | "oem.dashboard"
  | "oem.tickets.view"
  | "oem.tickets.create"
  | "oem.tickets.edit"
  | "oem.tickets.transition"
  | "oem.assignment.assign"
  | "oem.reports.review"
  | "oem.customers.view"
  | "oem.products.view"
  | "oem.analytics.view"
  /* Engineer workspace */
  | "eng.dashboard"
  | "eng.requests.view"
  | "eng.requests.respond"
  | "eng.visits.manage"
  | "eng.reports.submit"
  | "eng.profile.manage"
  | "eng.onboarding.submit"
  /* Platform admin */
  | "admin.dashboard"
  | "admin.oems.manage"
  | "admin.engineers.verify"
  | "admin.tickets.view"
  | "admin.operations.intervene"
  | "admin.amc.manage"
  | "admin.network.view"
  | "admin.commercial.manage"
  | "admin.integrations.manage"
  | "admin.settings.manage"
  | "admin.audit.view"
  /* Shared */
  | "shared.notifications"
  | "shared.search"
  | "shared.assistant"
  | "shared.settings";

const ALL: Permission[] = [
  "shared.notifications",
  "shared.search",
  "shared.assistant",
  "shared.settings",
];

const MATRIX: Record<Role, Permission[]> = {
  oem_admin: [
    ...ALL,
    "oem.dashboard",
    "oem.tickets.view",
    "oem.tickets.create",
    "oem.tickets.edit",
    "oem.tickets.transition",
    "oem.assignment.assign",
    "oem.reports.review",
    "oem.customers.view",
    "oem.products.view",
    "oem.analytics.view",
  ],
  oem_service_manager: [
    ...ALL,
    "oem.dashboard",
    "oem.tickets.view",
    "oem.tickets.create",
    "oem.tickets.edit",
    "oem.tickets.transition",
    "oem.assignment.assign",
    "oem.reports.review",
    "oem.customers.view",
    "oem.products.view",
    "oem.analytics.view",
  ],
  oem_service_executive: [
    ...ALL,
    "oem.dashboard",
    "oem.tickets.view",
    "oem.tickets.create",
    "oem.tickets.edit",
    "oem.assignment.assign",
    "oem.customers.view",
    "oem.products.view",
  ],
  engineer: [
    ...ALL,
    "eng.dashboard",
    "eng.requests.view",
    "eng.requests.respond",
    "eng.visits.manage",
    "eng.reports.submit",
    "eng.profile.manage",
    "eng.onboarding.submit",
  ],
  partner_manager: [
    ...ALL,
    "eng.dashboard",
    "eng.requests.view",
    "eng.requests.respond",
    "eng.visits.manage",
    "eng.reports.submit",
    "eng.profile.manage",
    "eng.onboarding.submit",
  ],
  super_admin: [
    ...ALL,
    "admin.dashboard",
    "admin.oems.manage",
    "admin.engineers.verify",
    "admin.tickets.view",
    "admin.operations.intervene",
    "admin.amc.manage",
    "admin.network.view",
    "admin.commercial.manage",
    "admin.integrations.manage",
    "admin.settings.manage",
    "admin.audit.view",
    "oem.customers.view",
    "oem.products.view",
  ],
  ops_manager: [
    ...ALL,
    "admin.dashboard",
    "admin.engineers.verify",
    "admin.tickets.view",
    "admin.operations.intervene",
    "admin.amc.manage",
    "admin.network.view",
    "admin.audit.view",
  ],
  support_executive: [
    ...ALL,
    "admin.dashboard",
    "admin.tickets.view",
    "admin.audit.view",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function portalForRole(role: Role): Portal {
  return ROLE_PORTAL[role];
}

/** Roles allowed to perform a ticket status transition from `from`. */
export function rolesForTransition(from: string, to: string): (Role | "system")[] {
  const table: Record<string, (Role | "system")[]> = {
    "new>under_review": ["oem_admin", "oem_service_manager", "oem_service_executive", "super_admin", "ops_manager"],
    "new>awaiting_assignment": ["oem_admin", "oem_service_manager", "oem_service_executive", "super_admin", "ops_manager"],
    "under_review>awaiting_assignment": ["oem_admin", "oem_service_manager", "oem_service_executive", "super_admin", "ops_manager"],
    "under_review>new": ["oem_admin", "oem_service_manager", "super_admin"],
    "awaiting_assignment>offered": ["oem_admin", "oem_service_manager", "oem_service_executive", "super_admin", "ops_manager"],
    "awaiting_assignment>under_review": ["oem_admin", "oem_service_manager", "super_admin", "ops_manager"],
    "offered>accepted": ["engineer", "partner_manager"],
    "offered>rejected": ["engineer", "partner_manager"],
    "offered>awaiting_assignment": ["oem_admin", "oem_service_manager", "super_admin", "ops_manager", "system"],
    "accepted>contact_pending": ["engineer", "partner_manager", "oem_service_manager", "super_admin", "ops_manager"],
    "accepted>visit_scheduled": ["engineer", "partner_manager", "oem_service_manager", "super_admin", "ops_manager"],
    "accepted>awaiting_assignment": ["oem_admin", "oem_service_manager", "super_admin", "ops_manager"],
    "rejected>awaiting_assignment": ["oem_admin", "oem_service_manager", "super_admin", "ops_manager", "system"],
    "rejected>offered": ["oem_admin", "oem_service_manager", "super_admin", "ops_manager"],
    "contact_pending>visit_scheduled": ["engineer", "partner_manager", "super_admin", "ops_manager"],
    "contact_pending>awaiting_assignment": ["engineer", "partner_manager", "oem_service_manager", "super_admin", "ops_manager"],
    "visit_scheduled>in_progress": ["engineer", "partner_manager", "super_admin", "ops_manager"],
    "visit_scheduled>contact_pending": ["engineer", "partner_manager", "super_admin", "ops_manager"],
    "visit_scheduled>accepted": ["engineer", "partner_manager", "super_admin", "ops_manager"],
    "in_progress>report_submitted": ["engineer", "partner_manager", "super_admin", "ops_manager"],
    "in_progress>visit_scheduled": ["engineer", "partner_manager", "super_admin", "ops_manager"],
    "report_submitted>awaiting_oem_review": ["system", "engineer", "partner_manager", "super_admin", "ops_manager"],
    "awaiting_oem_review>completed": ["oem_admin", "oem_service_manager", "super_admin"],
    "awaiting_oem_review>clarification_required": ["oem_admin", "oem_service_manager", "oem_service_executive", "super_admin"],
    "awaiting_oem_review>escalated": ["oem_admin", "oem_service_manager", "oem_service_executive", "super_admin", "ops_manager"],
    "clarification_required>report_submitted": ["engineer", "partner_manager", "super_admin", "ops_manager"],
    "clarification_required>escalated": ["engineer", "partner_manager", "oem_admin", "oem_service_manager", "super_admin", "ops_manager"],
    "escalated>awaiting_oem_review": ["oem_admin", "oem_service_manager", "super_admin", "ops_manager"],
    "escalated>completed": ["oem_admin", "oem_service_manager", "super_admin"],
    "escalated>under_review": ["super_admin", "ops_manager"],
    "completed>closed": ["oem_admin", "oem_service_manager", "super_admin"],
    "completed>escalated": ["oem_admin", "oem_service_manager", "super_admin", "ops_manager"],
  };
  const key = `${from}>${to}`;
  return table[key] ?? [];
}

export function canTransition(role: Role | "system", from: string, to: string): boolean {
  if (from === to) return false;
  return rolesForTransition(from, to).includes(role);
}

/** Decisions that stay with the OEM unless explicitly delegated. */
export const OEM_CONTROLLED_DECISIONS = [
  "Warranty approval",
  "Repair authorisation",
  "Replacement approval",
  "Commercial settlement",
] as const;
