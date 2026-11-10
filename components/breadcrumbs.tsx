"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  oem: "OEM Portal",
  engineer: "Engineer Portal",
  admin: "Admin Portal",
  tickets: "Tickets",
  new: "New Ticket",
  engineers: "Engineers",
  reports: "Service Reports",
  customers: "Customers",
  sites: "Sites",
  products: "Products",
  analytics: "Analytics",
  onboarding: "Onboarding",
  requests: "Available Requests",
  assignments: "Assignments",
  visits: "Visits",
  profile: "Profile",
  oems: "OEM Organisations",
  operations: "Assignment Operations",
  amc: "AMC & Maintenance",
  network: "Service Network",
  subscriptions: "Commercial & Billing",
  integrations: "Integrations",
  settings: "Settings",
  audit: "Audit Logs",
  notifications: "Notifications",
  assistant: "AI Assistant",
  search: "Global Search",
  portal: "Customer Portal",
  contracts: "Contracts",
  maintenance: "Maintenance",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-[13px]">
        <li>
          <Link href="/dashboard" className="text-ink-faint transition-colors hover:text-ink">
            Home
          </Link>
        </li>
        {segments.map((seg, i) => {
          const href = "/" + segments.slice(0, i + 1).join("/");
          const isLast = i === segments.length - 1;
          const label = LABELS[seg] ?? decodeURIComponent(seg).replace(/-/g, " ");
          return (
            <li key={href} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-ink-faint" aria-hidden />
              {isLast ? (
                <span aria-current="page" className="font-medium capitalize text-ink">
                  {label}
                </span>
              ) : (
                <Link href={href} className="text-ink-faint capitalize transition-colors hover:text-ink">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
