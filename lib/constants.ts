import type {
  NotificationChannel,
  Role,
  TicketPriority,
  TicketStatus,
} from "./types";

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

export const ROLE_LABELS: Record<Role, string> = {
  oem_admin: "OEM Admin",
  oem_service_manager: "OEM Service Manager",
  oem_service_executive: "OEM Service Executive",
  engineer: "Engineer",
  partner_manager: "Service Partner Manager",
  super_admin: "RAYVIQ Super Admin",
  ops_manager: "RAYVIQ Operations Manager",
  support_executive: "RAYVIQ Support Executive",
};

export const ROLE_PORTAL: Record<Role, "oem" | "engineer" | "admin"> = {
  oem_admin: "oem",
  oem_service_manager: "oem",
  oem_service_executive: "oem",
  engineer: "engineer",
  partner_manager: "engineer",
  super_admin: "admin",
  ops_manager: "admin",
  support_executive: "admin",
};

export const ROLE_GROUP_LABELS = {
  oem: "OEM / Company Portal",
  engineer: "Engineer / Service Partner Portal",
  admin: "RAYVIQ Admin Portal",
} as const;

/* ------------------------------------------------------------------ */
/* Ticket lifecycle                                                    */
/* ------------------------------------------------------------------ */

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  new: "New",
  under_review: "Under Review",
  awaiting_assignment: "Awaiting Assignment",
  offered: "Offered",
  accepted: "Accepted",
  rejected: "Rejected",
  contact_pending: "Contact Pending",
  visit_scheduled: "Visit Scheduled",
  in_progress: "In Progress",
  report_submitted: "Report Submitted",
  awaiting_oem_review: "Awaiting OEM Review",
  clarification_required: "Clarification Required",
  escalated: "Escalated",
  completed: "Completed",
  closed: "Closed",
};

/**
 * Workflow transitions. Arbitrary status changes are not allowed — a ticket
 * may only move to one of its defined next states (further gated by role).
 */
export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  new: ["under_review", "awaiting_assignment"],
  under_review: ["awaiting_assignment", "new"],
  awaiting_assignment: ["offered", "under_review"],
  offered: ["accepted", "rejected", "awaiting_assignment"],
  accepted: ["contact_pending", "visit_scheduled", "awaiting_assignment"],
  rejected: ["awaiting_assignment", "offered"],
  contact_pending: ["visit_scheduled", "awaiting_assignment"],
  visit_scheduled: ["in_progress", "contact_pending", "accepted"],
  in_progress: ["report_submitted", "visit_scheduled"],
  report_submitted: ["awaiting_oem_review"],
  awaiting_oem_review: ["completed", "clarification_required", "escalated"],
  clarification_required: ["report_submitted", "escalated"],
  escalated: ["awaiting_oem_review", "completed", "under_review"],
  completed: ["closed", "escalated"],
  closed: [],
};

/** Statuses in which the ticket is still open (drives KPI buckets). */
export const OPEN_STATUSES: TicketStatus[] = [
  "new",
  "under_review",
  "awaiting_assignment",
  "offered",
  "accepted",
  "rejected",
  "contact_pending",
  "visit_scheduled",
  "in_progress",
  "report_submitted",
  "awaiting_oem_review",
  "clarification_required",
  "escalated",
];

export const TICKET_STATUS_TONES: Record<
  TicketStatus,
  "gray" | "blue" | "cyan" | "amber" | "violet" | "green" | "red" | "indigo"
> = {
  new: "blue",
  under_review: "indigo",
  awaiting_assignment: "cyan",
  offered: "violet",
  accepted: "green",
  rejected: "red",
  contact_pending: "amber",
  visit_scheduled: "cyan",
  in_progress: "blue",
  report_submitted: "violet",
  awaiting_oem_review: "amber",
  clarification_required: "amber",
  escalated: "red",
  completed: "green",
  closed: "gray",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const PRIORITY_ORDER: Record<TicketPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/* ------------------------------------------------------------------ */
/* Issue / product categories                                          */
/* ------------------------------------------------------------------ */

export const ISSUE_CATEGORY_GROUPS = [
  "electrical",
  "communication",
  "performance",
  "mechanical",
  "installation",
  "other",
] as const;

export const ISSUE_CATEGORIES = [
  "No output / zero generation",
  "Inverter tripping frequently",
  "Error code displayed",
  "Grid mismatch / low voltage",
  "Communication / Wi-Fi failure",
  "AC isolator or MCB issue",
  "DC string fuse failure",
  "Fan or cooling fault",
  "Display / HMI malfunction",
  "Physical damage or corrosion",
  "Water ingress",
  "Installation quality issue",
  "Metering or monitoring issue",
  "Preventive maintenance request",
  "Other",
];

export const PRODUCT_CATEGORIES = [
  "string_inverter",
  "central_inverter",
  "hybrid_inverter",
  "micro_inverter",
  "pump_inverter",
];

export const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  string_inverter: "String Inverter",
  central_inverter: "Central Inverter",
  hybrid_inverter: "Hybrid Inverter",
  micro_inverter: "Micro Inverter",
  pump_inverter: "Solar Pump Inverter",
};

export const ISSUE_GROUP_LABELS: Record<string, string> = {
  electrical: "Electrical",
  communication: "Communication",
  performance: "Performance",
  mechanical: "Mechanical",
  installation: "Installation",
  other: "Other",
};

/* ------------------------------------------------------------------ */
/* Misc labels                                                         */
/* ------------------------------------------------------------------ */

export const VISIT_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  rescheduled: "Rescheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  customer_unavailable: "Customer Unavailable",
  failed: "Failed Visit",
  in_progress: "In Progress",
};

export const ASSIGNMENT_STATE_LABELS: Record<string, string> = {
  pending_offer: "Awaiting Response",
  accepted: "Accepted",
  rejected: "Rejected",
  no_response: "No Response",
  revoked: "Revoked",
  reassigned: "Reassigned",
};

export const AMC_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  expiring: "Expiring Soon",
  expired: "Expired",
  renewal_due: "Renewal Due",
  draft: "Draft",
};

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  maintenance_due: "Maintenance Due",
  visit_planned: "Visit Planned",
  engineer_assigned: "Engineer Assigned",
  visit_scheduled: "Visit Scheduled",
  inspection_started: "Inspection Started",
  maintenance_completed: "Maintenance Completed",
  report_submitted: "Report Submitted",
  review_completed: "Review Completed",
};

export const NOTIFICATION_CHANNELS: { key: NotificationChannel; label: string }[] = [
  { key: "in_app", label: "In-app" },
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
  { key: "whatsapp", label: "WhatsApp" },
];

export const DEMO_DISCLAIMER =
  "Demo environment — data is simulated. No real emails, SMS, WhatsApp messages, payments or warranty decisions are processed.";
