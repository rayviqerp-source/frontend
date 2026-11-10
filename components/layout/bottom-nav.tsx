"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore, unreadCount } from "@/lib/store";
import { cn } from "@/lib/utils";

type TabKey = "bookings" | "secondary" | "home" | "notifications" | "profile";

interface TabItem {
  key: TabKey;
  label: string;
  href: string;
  icon: React.ElementType;
}

/* Role-aware tabs. Home always centre (index 2 of 5).
 * The "My Profile" label belongs to the CLIENT app only (customer account at
 * /client/profile). Workspace roles route to their own profile pages:
 * OEM → /oem/profile · engineer → /engineer/profile · vendor → /vendor/profile
 * platform staff → /profile. Each of those pages has its own role-specific
 * actions at the top and bottom. */
const ROLE_TABS: Record<string, TabItem[]> = {
  oem_admin: [
    { key: "bookings", label: "Bookings", href: "/oem/tickets", icon: TicketIcon },
    { key: "secondary", label: "Engineers", href: "/oem/engineers", icon: Wrench },
    { key: "home", label: "Home", href: "/dashboard", icon: Home },
    { key: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
    { key: "profile", label: "Profile", href: "/oem/profile", icon: User },
  ],
  oem_service_manager: [
    { key: "bookings", label: "Bookings", href: "/oem/tickets", icon: TicketIcon },
    { key: "secondary", label: "Engineers", href: "/oem/engineers", icon: Wrench },
    { key: "home", label: "Home", href: "/dashboard", icon: Home },
    { key: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
    { key: "profile", label: "Profile", href: "/oem/profile", icon: User },
  ],
  oem_service_executive: [
    { key: "bookings", label: "Bookings", href: "/oem/tickets", icon: TicketIcon },
    { key: "secondary", label: "Reports", href: "/oem/reports", icon: ClipboardList },
    { key: "home", label: "Home", href: "/dashboard", icon: Home },
    { key: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
    { key: "profile", label: "Profile", href: "/oem/profile", icon: User },
  ],
  engineer: [
    { key: "bookings", label: "Requests", href: "/engineer/requests", icon: ClipboardList },
    { key: "secondary", label: "Visits", href: "/engineer/visits", icon: Activity },
    { key: "home", label: "Home", href: "/dashboard", icon: Home },
    { key: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
    { key: "profile", label: "Profile", href: "/engineer/profile", icon: User },
  ],
  partner_manager: [
    { key: "bookings", label: "Requests", href: "/engineer/requests", icon: ClipboardList },
    { key: "secondary", label: "Assignments", href: "/engineer/assignments", icon: TicketIcon },
    { key: "home", label: "Home", href: "/dashboard", icon: Home },
    { key: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
    { key: "profile", label: "Profile", href: "/vendor/profile", icon: User },
  ],
  super_admin: [
    { key: "bookings", label: "Tickets", href: "/admin/tickets", icon: TicketIcon },
    { key: "secondary", label: "Operations", href: "/admin/operations", icon: Activity },
    { key: "home", label: "Home", href: "/dashboard", icon: Home },
    { key: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
    { key: "profile", label: "Profile", href: "/profile", icon: User },
  ],
  ops_manager: [
    { key: "bookings", label: "Tickets", href: "/admin/tickets", icon: TicketIcon },
    { key: "secondary", label: "Operations", href: "/admin/operations", icon: Activity },
    { key: "home", label: "Home", href: "/dashboard", icon: Home },
    { key: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
    { key: "profile", label: "Profile", href: "/profile", icon: User },
  ],
  support_executive: [
    { key: "bookings", label: "Tickets", href: "/admin/tickets", icon: TicketIcon },
    { key: "secondary", label: "Audit", href: "/admin/audit", icon: ShieldCheck },
    { key: "home", label: "Home", href: "/dashboard", icon: Home },
    { key: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
    { key: "profile", label: "Profile", href: "/profile", icon: User },
  ],
};

const CENTER_INDEX = 2;

function TicketIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16V9m0 0V4m0 5h6m-6 5h6m-6 12v-3m0 0h6m-6 3v-6l2-1m0 0 1-1m-1 1a4 4 0 10-8 0 4 4 0 008 0z"
      />
    </svg>
  );
}

function Wrench() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function Home() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function Bell() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function User() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function ClipboardList() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002-2h2.586a1 1 0 01.707.293l5.414 5.414a2 2 0 01.586 1.414l.03.092a2 2 0 00-.563 3.471l-2.72 2.723a2 2 0 01-1.414.586l.03-.092a2 2 0 00-1.414-.586l-.03-.092a2 2 0 01-.586-1.414l-.092-.03a2 2 0 00-1.414-.586l-2.72-2.723a2 2 0 01-.586-1.414l-.03-.092a2 2 0 00-.563-3.471l-.03-.092a2 2 0 01-.586-1.414z"
      />
    </svg>
  );
}

function Activity() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function ShieldCheck() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export function BottomNav() {
  const { effectiveRole, state } = useStore();
  const pathname = usePathname();
  const [floatingOpen, setFloatingOpen] = useState(false);

  const tabs = ROLE_TABS[effectiveRole] ?? ROLE_TABS.oem_admin;
  const uid = state.currentUserId ?? "USR-08";
  const visible = state.notifications.filter((n) =>
    n.audience.includes(effectiveRole),
  );
  const unread = visible.filter((n) => !n.readBy.includes(uid)).length;

  const isActive = (href: string) => {
    if (href === "/dashboard")
      return pathname === "/dashboard" || pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const centerTab = tabs[CENTER_INDEX];

  return (
    <>
      {/* Floating action button above centre Home tab */}
      <div
        className={cn(
          "fixed left-1/2 -translate-x-1/2 bottom-[112px] z-50 flex items-center justify-center pointer-events-none",
          floatingOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none transition-all duration-200"
        )}
      >
        <div className="flex items-center gap-2">
          <Link
            href="/oem/tickets/new"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg box-border transition-all duration-200 hover:scale-105"
            aria-label="New ticket"
          >
            <Plus className="h-5 w-5" />
          </Link>
          {floatingOpen && (
            <span className="px-2 py-0.5 rounded-full bg-ink text-xs text-white whitespace-nowrap">
              New ticket
            </span>
          )}
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex h-[70px] border-t border-line bg-surface/95 backdrop-blur-md px-3 pb-4 sm:hidden",
          "overflow-visible"
        )}
        aria-label="Bottom navigation"
      >
        <div className="flex w-full justify-around items-end gap-0.5 px-1">
          {tabs.map((tab, i) => {
            const active = isActive(tab.href);
            const isCenter = i === CENTER_INDEX;
            const Icon: React.ElementType =
              i === CENTER_INDEX ? Home : tab.icon;
            const badgeCount =
              tab.key === "notifications" ? unread : null;
            const badge =
              badgeCount != null && badgeCount > 0
                ? badgeCount > 9
                  ? "9+"
                  : String(badgeCount)
                : null;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center justify-end gap-0.5 min-w-[56px]",
                  active ? "text-brand-600" : "text-ink-faint",
                  isCenter && "scale-110 z-10",
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full",
                    active
                      ? "bg-brand-600 text-white shadow-lg"
                      : "bg-surface-alt border border-line text-ink-soft",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3 w-3",
                      active ? "text-white" : "text-ink-faint",
                    )}
                    aria-hidden
                  />
                </div>
                {tab.label && (
                  <span
                    className={cn(
                      "mt-0.5 text-[10px] font-medium leading-none",
                      active
                        ? "font-semibold text-brand-700"
                        : "text-ink-faint",
                    )}
                  >
                    {tab.label}
                  </span>
                )}
                {badge && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-0.5 text-[9px] font-bold text-white",
                      isCenter ? "right-1/2 translate-x-1/2" : "",
                    )}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Floating action toggle */}
        <button
          type="button"
          onClick={() => setFloatingOpen((o) => !o)}
          className="absolute left-1/2 -translate-x-1/2 bottom-[88px] z-50 flex h-8 w-8 items-center justify-center rounded-full bg-accent-500 text-white shadow-lg hover:bg-accent-600 transition-all"
          aria-label={floatingOpen ? "Hide quick actions" : "Show quick actions"}
        >
          <Plus className="h-4 w-4" />
        </button>
      </nav>
    </>
  );
}
