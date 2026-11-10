/**
 * RAYVIQ domain model.
 *
 * These interfaces are the single source of truth for the demo data layer and
 * the shape a future REST/GraphQL API is expected to return. Nothing in here
 * performs IO — see `lib/store.tsx` for state mutations and `lib/seed.ts` for
 * the seeded demonstration dataset.
 */

/* ------------------------------------------------------------------ */
/* Identity & access                                                   */
/* ------------------------------------------------------------------ */

export type Role =
  | "oem_admin"
  | "oem_service_manager"
  | "oem_service_executive"
  | "engineer"
  | "partner_manager"
  | "super_admin"
  | "ops_manager"
  | "support_executive";

export type Portal = "oem" | "engineer" | "admin";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** OEM the user belongs to (null for RAYVIQ platform staff). */
  oemId: string | null;
  /** Service partner the user belongs to (engineer / partner manager). */
  partnerId?: string | null;
  /** Engineer record linked to this user, when the user is an engineer. */
  engineerId?: string | null;
  phone?: string;
  designation?: string;
  avatarColor: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Network                                                             */
/* ------------------------------------------------------------------ */

export interface Oem {
  id: string;
  name: string;
  shortName: string;
  status: "active" | "suspended" | "onboarding";
  industry: string;
  hqCity: string;
  hqState: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  planId: string;
  subscriptionStatus: "active" | "trial" | "past_due" | "cancelled";
  seats: number;
  serviceRegions: string[];
  productCategories: string[];
  goLiveDate: string;
  logoColor: string;
  createdAt: string;
}

export type VerificationStatus =
  | "draft"
  | "submitted"
  | "under_verification"
  | "approved"
  | "rejected"
  | "more_info_required";

export interface ServicePartner {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  status: "active" | "inactive";
  rating: number;
  since: string;
}

export interface Engineer {
  id: string;
  partnerId: string | null;
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  serviceRadiusKm: number;
  skills: string[];
  productExpertise: string[];
  /** Engineer-chosen card banner artwork ("" = auto from product expertise). */
  cardArt?: string;
  certifications: string[];
  experienceYears: number;
  languages: string[];
  status: "active" | "suspended" | "pending" | "inactive";
  verification: VerificationStatus;
  /** Restrict the engineer to a single OEM when set (demo data). */
  exclusiveOemId: string | null;
  availability: "available" | "busy" | "offline";
  currentLoad: number;
  maxLoad: number;
  rating: number;
  completedJobs: number;
  acceptanceRate: number;
  rejectionRate: number;
  avgResponseMins: number;
  reportQualityScore: number;
  onboardingStep: number;
  onboardingNotes?: string;
  documents: EngineerDocument[];
  bankDetailsProvided: boolean;
  joinedAt: string;
}

export interface EngineerDocument {
  id: string;
  label: string;
  type: string;
  status: "verified" | "pending" | "rejected" | "missing";
  uploadedAt?: string;
}

/* ------------------------------------------------------------------ */
/* Customers, sites, equipment                                         */
/* ------------------------------------------------------------------ */

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  type: "end_customer" | "dealer" | "epc";
  city: string;
  state: string;
  pincode: string;
  createdAt: string;
}

export interface Site {
  id: string;
  customerId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gps?: string;
  capacityKw: number;
  installationDate: string;
  siteType: "rooftop" | "ground_mount" | "solar_farmland" | "commercial_rooftop";
  amcId?: string;
}

export type EquipmentStatus = "operational" | "faulty" | "under_service" | "replaced";

export interface Equipment {
  id: string;
  siteId: string;
  oemId: string;
  model: string;
  serialNumber: string;
  category: "string_inverter" | "central_inverter" | "hybrid_inverter" | "micro_inverter" | "pump_inverter";
  capacityKw: number;
  installationDate: string;
  warrantyEndsOn: string;
  status: EquipmentStatus;
  firmware?: string;
}

/* ------------------------------------------------------------------ */
/* Tickets                                                             */
/* ------------------------------------------------------------------ */

export type TicketStatus =
  | "new"
  | "under_review"
  | "awaiting_assignment"
  | "offered"
  | "accepted"
  | "rejected"
  | "contact_pending"
  | "visit_scheduled"
  | "in_progress"
  | "report_submitted"
  | "awaiting_oem_review"
  | "clarification_required"
  | "escalated"
  | "completed"
  | "closed";

export type TicketPriority = "critical" | "high" | "medium" | "low";

export interface TicketLocation {
  address: string;
  state: string;
  city: string;
  pincode: string;
  gps?: string;
}

export interface TicketProductInfo {
  model: string;
  serialNumber: string;
  category: string;
  installationDate?: string;
  warrantyStatus: "in_warranty" | "extended_warranty" | "out_of_warranty" | "amc_covered" | "unknown";
  amcId?: string;
}

export interface TicketAttachment {
  id: string;
  name: string;
  kind: "image" | "document";
  sizeKb: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface TimelineEvent {
  id: string;
  at: string;
  actor: string;
  actorRole: Role | "system";
  type:
    | "created"
    | "status"
    | "assignment"
    | "offer"
    | "response"
    | "contact"
    | "visit"
    | "report"
    | "review"
    | "escalation"
    | "note"
    | "sla"
    | "closure";
  title: string;
  detail?: string;
  fromStatus?: TicketStatus;
  toStatus?: TicketStatus;
}

export interface InternalNote {
  id: string;
  author: string;
  body: string;
  at: string;
  visibility: "oem_internal" | "platform_internal";
}

export type AssignmentState = "pending_offer" | "accepted" | "rejected" | "no_response" | "revoked" | "reassigned";

export interface Assignment {
  id: string;
  ticketId: string;
  engineerId: string;
  state: AssignmentState;
  assignedBy: string;
  assignedAt: string;
  respondedAt?: string;
  responseDeadline: string;
  reason?: string;
  isFallback?: boolean;
}

export type VisitOutcome = "scheduled" | "rescheduled" | "completed" | "cancelled" | "customer_unavailable" | "failed" | "in_progress";

export interface Visit {
  id: string;
  ticketId: string;
  engineerId: string;
  scheduledFor: string;
  slot: string;
  status: VisitOutcome;
  notes?: string;
  reason?: string;
  customerContactedAt?: string;
  startedAt?: string;
  completedAt?: string;
  evidence: TicketAttachment[];
}

export interface ServiceReport {
  id: string;
  ticketId: string;
  engineerId: string;
  submittedAt: string;
  inspectionFindings: string;
  diagnosis: string;
  workPerformed: string;
  partsUsed: string;
  errorCodes: string;
  recommendations: string;
  followUpRequired: boolean;
  customerAcknowledged: boolean;
  safetyObservations?: string;
  evidence: TicketAttachment[];
  status: "draft" | "submitted" | "clarification_requested" | "approved" | "rejected";
  reviewRemark?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Escalation {
  id: string;
  ticketId: string;
  level: 1 | 2 | 3;
  raisedBy: string;
  raisedAt: string;
  reason: string;
  target: "oem" | "rayviq_ops" | "oem_senior";
  status: "open" | "acknowledged" | "resolved";
  resolution?: string;
}

export interface Ticket {
  id: string;
  ref: string;
  oemId: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  dueAt: string;
  source: "phone" | "email" | "portal" | "whatsapp" | "dealer";
  customerId: string;
  siteId: string;
  equipmentId?: string;
  contact: {
    name: string;
    phone: string;
    email?: string;
    company?: string;
    availability: string;
  };
  location: TicketLocation;
  product: TicketProductInfo;
  issue: {
    category: string;
    description: string;
    errorCode?: string;
    categoryGroup: "electrical" | "communication" | "performance" | "mechanical" | "installation" | "other";
  };
  assignedEngineerId?: string;
  sla: {
    responseDueAt: string;
    assignmentDueAt: string;
    visitDueAt: string;
    resolutionDueAt: string;
    breached: boolean;
  };
  attachments: TicketAttachment[];
  timeline: TimelineEvent[];
  notes: InternalNote[];
  reportId?: string;
  escalationIds: string[];
  closedAt?: string;
  createdBy: string;
}

/* ------------------------------------------------------------------ */
/* AMC                                                                 */
/* ------------------------------------------------------------------ */

export type MaintenanceStatus =
  | "maintenance_due"
  | "visit_planned"
  | "engineer_assigned"
  | "visit_scheduled"
  | "inspection_started"
  | "maintenance_completed"
  | "report_submitted"
  | "review_completed";

export interface AmcContract {
  id: string;
  ref: string;
  oemId: string;
  customerId: string;
  siteId: string;
  equipmentIds: string[];
  planName: string;
  status: "active" | "expiring" | "expired" | "renewal_due" | "draft";
  startsOn: string;
  endsOn: string;
  serviceFrequency: "quarterly" | "half_yearly" | "annual" | "monthly";
  coverage: {
    preventiveVisits: boolean;
    breakdownVisits: boolean;
    labourIncluded: boolean;
    travelIncluded: boolean;
    spareParts: "included" | "excluded" | "chargeable";
    responseHours: number;
  };
  notes?: string;
  createdAt: string;
}

export interface MaintenanceVisit {
  id: string;
  amcId: string;
  ticketId?: string;
  dueOn: string;
  status: MaintenanceStatus;
  engineerId?: string;
  scheduledFor?: string;
  checklist: { label: string; done: boolean }[];
  reportId?: string;
  completedAt?: string;
}

/* ------------------------------------------------------------------ */
/* Notifications, audit, platform                                      */
/* ------------------------------------------------------------------ */

export type NotificationChannel = "in_app" | "email" | "sms" | "whatsapp";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type:
    | "ticket_created"
    | "ticket_assigned"
    | "assignment_accepted"
    | "assignment_rejected"
    | "contact_pending"
    | "visit_scheduled"
    | "visit_rescheduled"
    | "visit_completed"
    | "report_submitted"
    | "clarification_requested"
    | "ticket_escalated"
    | "ticket_completed"
    | "amc_visit_due"
    | "amc_renewal"
    | "sla_breach"
    | "engineer_verification"
    | "system";
  audience: Role[];
  oemId?: string;
  engineerId?: string;
  ticketRef?: string;
  createdAt: string;
  readBy: string[];
  channels: NotificationChannel[];
  delivery: "delivered" | "queued" | "failed" | "skipped_no_provider";
}

export interface AuditLog {
  id: string;
  at: string;
  actor: string;
  actorRole: Role | "system";
  action: string;
  target: string;
  targetRef?: string;
  detail?: string;
  severity: "info" | "warning" | "critical";
}

export interface SlaTarget {
  priority: TicketPriority;
  responseMins: number;
  assignmentMins: number;
  visitHours: number;
  resolutionHours: number;
}

export interface EscalationRule {
  id: string;
  name: string;
  trigger: string;
  level: 1 | 2 | 3;
  notifyRoles: Role[];
  enabled: boolean;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  event: string;
  channels: NotificationChannel[];
  subject: string;
  body: string;
  enabled: boolean;
}

export interface PlatformSettings {
  organisationName: string;
  supportEmail: string;
  timezone: string;
  slaTargets: SlaTarget[];
  escalationRules: EscalationRule[];
  ticketStatuses: { key: TicketStatus; label: string; enabled: boolean }[];
  priorities: { key: TicketPriority; label: string; enabled: boolean }[];
  issueCategories: string[];
  productCategories: string[];
  notificationTemplates: NotificationTemplate[];
  notificationChannels: Record<NotificationChannel, boolean>;
  assignment: {
    strategy: "manual" | "recommended" | "auto_offer";
    offerTimeoutMins: number;
    fallbackToQueue: boolean;
    maxConcurrentOffers: number;
  };
}

/* ------------------------------------------------------------------ */
/* Commercial                                                          */
/* ------------------------------------------------------------------ */

export interface SubscriptionPlan {
  id: string;
  name: string;
  billingModel: "oem_subscription" | "per_ticket" | "platform_fee" | "hybrid";
  /** Demo-only placeholder figures — no real pricing is configured. */
  priceLabel: string;
  ticketQuota: number | null;
  seats: number;
  features: string[];
  highlight?: boolean;
}

export interface OrganisationSubscription {
  id: string;
  oemId: string;
  planId: string;
  status: "active" | "trial" | "past_due" | "cancelled";
  startedOn: string;
  renewsOn: string;
  seatsUsed: number;
  ticketsThisCycle: number;
  invoices: Invoice[];
}

export interface Invoice {
  id: string;
  number: string;
  issuedOn: string;
  amountLabel: string;
  status: "paid" | "due" | "overdue" | "draft";
}

/* ------------------------------------------------------------------ */
/* Integrations                                                        */
/* ------------------------------------------------------------------ */

export type IntegrationState = "not_connected" | "demo" | "configured" | "error" | "disabled";

export interface Integration {
  id: string;
  name: string;
  category: "crm" | "erp" | "warranty" | "email" | "sms" | "whatsapp" | "maps" | "ai" | "storage" | "payments";
  description: string;
  state: IntegrationState;
  lastSyncAt?: string;
  errorNote?: string;
  setupSteps: string[];
}

/* ------------------------------------------------------------------ */
/* AI assistant                                                        */
/* ------------------------------------------------------------------ */

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
  suggestions?: string[];
  handoffOffered?: boolean;
}

/* ------------------------------------------------------------------ */
/* Customer / dealer portal (future-ready demo)                        */
/* ------------------------------------------------------------------ */

export interface PortalSession {
  customerId: string;
  demo: true;
}

/* ------------------------------------------------------------------ */
/* Root application state (client store)                               */
/* ------------------------------------------------------------------ */

export interface AppState {
  version: number;
  users: DemoUser[];
  currentUserId: string | null;
  /** Demo-only role override so reviewers can impersonate any role. */
  roleOverride: Role | null;
  oems: Oem[];
  partners: ServicePartner[];
  engineers: Engineer[];
  customers: Customer[];
  sites: Site[];
  equipment: Equipment[];
  tickets: Ticket[];
  assignments: Assignment[];
  visits: Visit[];
  reports: ServiceReport[];
  escalations: Escalation[];
  amcContracts: AmcContract[];
  maintenanceVisits: MaintenanceVisit[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  plans: SubscriptionPlan[];
  subscriptions: OrganisationSubscription[];
  integrations: Integration[];
  settings: PlatformSettings;
  /** Session flag for the future-ready customer portal demo. */
  portalCustomerIds: string[];
}
