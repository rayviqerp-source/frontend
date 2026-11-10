"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useStore } from "@/lib/store";
import { can } from "@/lib/permissions";
import { ROLE_PORTAL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/logo";
import { ADMIN_NAV, ENGINEER_NAV, OEM_NAV, SHARED_NAV, VENDOR_NAV } from "./nav-config";

function Logo({ compact }: { compact?: boolean }) {
  return (
    <BrandLogo
      variant={compact ? "mark" : "full"}
      href="/dashboard"
      className="rounded-lg px-1 py-1"
      priority
    />
  );
}

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { effectiveRole } = useStore();
  const portal = ROLE_PORTAL[effectiveRole];
  const portalNav = portal === "oem" ? OEM_NAV : portal === "engineer" ? ENGINEER_NAV : ADMIN_NAV;
  const sections = [
    // Service partners (vendors) get their own workspace first, then the
    // engineer portal they already share.
    ...(effectiveRole === "partner_manager" ? [...VENDOR_NAV, ...portalNav] : portalNav),
    ...SHARED_NAV,
  ];

  const isActive = (href: string, match?: string[]) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    if (href === "/vendor") return pathname === "/vendor";
    if (match?.length) return match.some((m) => pathname.startsWith(m));
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4" aria-label="Main">
      {sections.map((section, i) => (
        <div key={section.title ?? i}>
          {section.title && !collapsed && (
            <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              {section.title}
            </p>
          )}
          <ul className="space-y-1">
            {section.items
              .filter((item) => !item.permission || can(effectiveRole, item.permission))
              .map((item) => {
                const active = isActive(item.href, item.match);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-ink-soft hover:bg-surface-alt hover:text-ink",
                        collapsed && "justify-center px-2",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-brand-600" : "text-ink-faint group-hover:text-ink-soft",
                        )}
                        aria-hidden
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { state, effectiveRole } = useStore();
  const uid = state.currentUserId ?? "USR-08";
  const unread = state.notifications.filter((n) => !n.readBy.includes(uid)).length;
  return (
    <div
      className={cn(
        "border-t border-line px-3 py-3 text-[11px] leading-4 text-ink-faint",
        collapsed && "px-2 text-center",
      )}
    >
      {collapsed ? (
        <span className="mx-auto block h-2 w-2 rounded-full bg-accent-500" title={`${unread} unread`} />
      ) : (
        <>
          <p className="font-medium text-ink-muted">Demo environment</p>
          <p className="mt-0.5">
            Role: {effectiveRole.replace(/_/g, " ")} · {unread} unread
          </p>
          <p className="mt-1 text-ink-faint/80">Mock data — no real backend connected.</p>
        </>
      )}
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-line px-3">
          <Logo compact={collapsed} />
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-alt hover:text-ink"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
          {collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="absolute -right-3 top-16 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-ink-faint shadow-card hover:text-ink"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <NavList collapsed={collapsed} />
        <SidebarFooter collapsed={collapsed} />
      </aside>
    </>
  );
}

export function MobileTopLogo() {
  return (
    <div className="flex items-center gap-2 lg:hidden">
      <BrandLogo href="/dashboard" imgClassName="h-7 w-auto" priority />
    </div>
  );
}
