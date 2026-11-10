import {
  Activity,
  BadgeCheck,
  BarChart3,
  Bot,
  Building2,
  CalendarClock,
  ClipboardList,
  Cpu,
  FileCheck2,
  FileText,
  Gauge,
  Layers,
  LayoutDashboard,
  ListChecks,
  Mail,
  MapPinned,
  Network,
  Package,
  Plug,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Ticket,
  Users,
  UserPlus,
  UserSquare2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
  /** Match nested routes for active state. */
  match?: string[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const OEM_NAV: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "oem.dashboard" },
      { href: "/oem/tickets", label: "Tickets", icon: Ticket, permission: "oem.tickets.view", match: ["/oem/tickets"] },
      { href: "/oem/engineers", label: "Engineer Network", icon: Wrench, permission: "oem.assignment.assign" },
      { href: "/oem/reports", label: "Service Reports", icon: FileCheck2, permission: "oem.reports.review", match: ["/oem/reports"] },
      { href: "/oem/customers", label: "Customers", icon: Users, permission: "oem.customers.view" },
      { href: "/oem/sites", label: "Sites", icon: MapPinned, permission: "oem.customers.view" },
      { href: "/oem/products", label: "Products & Equipment", icon: Cpu, permission: "oem.products.view" },
      { href: "/amc", label: "AMC & Maintenance", icon: ClipboardList },
      { href: "/oem/analytics", label: "Analytics", icon: BarChart3, permission: "oem.analytics.view" },
    ],
  },
];

export const ENGINEER_NAV: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "eng.dashboard" },
      { href: "/engineer/requests", label: "Available Requests", icon: Sparkles, permission: "eng.requests.view", match: ["/engineer/requests"] },
      { href: "/engineer/assignments", label: "My Assignments", icon: ListChecks, permission: "eng.requests.view", match: ["/engineer/assignments"] },
      { href: "/engineer/visits", label: "Visits", icon: CalendarClock, permission: "eng.visits.manage", match: ["/engineer/visits"] },
      { href: "/engineer/reports", label: "Service Reports", icon: FileText, permission: "eng.reports.submit", match: ["/engineer/reports"] },
      { href: "/engineer/onboarding", label: "Onboarding", icon: BadgeCheck, permission: "eng.onboarding.submit" },
      { href: "/engineer/profile", label: "Profile & Performance", icon: UserSquare2, permission: "eng.profile.manage" },
    ],
  },
];

/** Service partner (vendor) workspace — visible to the partner_manager role. */
export const VENDOR_NAV: NavSection[] = [
  {
    title: "Vendor Panel",
    items: [
      { href: "/vendor", label: "Partner Dashboard", icon: LayoutDashboard, permission: "eng.dashboard" },
      { href: "/vendor/engineers", label: "My Engineers", icon: Users, permission: "eng.onboarding.submit", match: ["/vendor/engineers"] },
      { href: "/vendor/onboarding", label: "Onboard Engineer", icon: UserPlus, permission: "eng.onboarding.submit" },
      { href: "/vendor/assignments", label: "Assignment Workflow", icon: ListChecks, permission: "eng.requests.view", match: ["/vendor/assignments"] },
    ],
  },
];

export const ADMIN_NAV: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "admin.dashboard" },
      { href: "/admin/oems", label: "OEM Organisations", icon: Building2, permission: "admin.oems.manage" },
      { href: "/admin/engineers", label: "Engineer Verification", icon: ShieldCheck, permission: "admin.engineers.verify", match: ["/admin/engineers"] },
      { href: "/admin/tickets", label: "Platform Tickets", icon: Ticket, permission: "admin.tickets.view" },
      { href: "/admin/operations", label: "Assignment Operations", icon: Activity, permission: "admin.operations.intervene" },
      { href: "/admin/amc", label: "AMC Operations", icon: ClipboardList, permission: "admin.amc.manage" },
      { href: "/admin/network", label: "Service Network", icon: Network, permission: "admin.network.view" },
      { href: "/admin/subscriptions", label: "Commercial & Billing", icon: Receipt, permission: "admin.commercial.manage" },
      { href: "/admin/integrations", label: "Integrations", icon: Plug, permission: "admin.integrations.manage" },
      { href: "/admin/settings", label: "Platform Settings", icon: Settings, permission: "admin.settings.manage" },
      { href: "/admin/audit", label: "Audit Logs", icon: ListChecks, permission: "admin.audit.view" },
    ],
  },
];

export const SHARED_NAV: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { href: "/marketplace", label: "Technician Marketplace", icon: Store, match: ["/marketplace"] },
      { href: "/search", label: "Global Search", icon: Search, permission: "shared.search" },
      { href: "/notifications", label: "Notifications", icon: Mail, permission: "shared.notifications" },
      { href: "/assistant", label: "AI Service Assistant", icon: Bot, permission: "shared.assistant" },
      { href: "/customer-portal", label: "Customer Portal (demo)", icon: Layers },
      { href: "/settings", label: "Settings", icon: Settings, permission: "shared.settings" },
    ],
  },
];

export const DEMO_USERS = [
  { id: "USR-01", label: "OEM Admin", sub: "Priya · Voltrix" },
  { id: "USR-02", label: "OEM Service Manager", sub: "Rohan · Voltrix" },
  { id: "USR-03", label: "OEM Service Executive", sub: "Ananya · Voltrix" },
  { id: "USR-04", label: "Engineer", sub: "Vikram · BrightField" },
  { id: "USR-05", label: "Partner Manager", sub: "Neha · BrightField" },
  { id: "USR-06", label: "Super Admin", sub: "Arjun · RAYVIQ" },
  { id: "USR-07", label: "Operations Manager", sub: "Kavita · RAYVIQ" },
  { id: "USR-08", label: "Support Executive", sub: "Sameer · RAYVIQ" },
] as const;

export const DASHBOARD_ICON = Gauge;
export const PRODUCT_ICON = Package;
