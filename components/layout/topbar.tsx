"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  ChevronDown,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/constants";
import { initials, relativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Dropdown, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/tabs";
import { MobileTopLogo } from "./sidebar";

const ROLE_ORDER = [
  "oem_admin",
  "oem_service_manager",
  "oem_service_executive",
  "engineer",
  "partner_manager",
  "super_admin",
  "ops_manager",
  "support_executive",
] as const;

export function Topbar() {
  const router = useRouter();
  const {
    state,
    currentUser,
    effectiveRole,
    setRoleOverride,
    logout,
    markAllNotificationsRead,
    markNotificationRead,
    toast,
  } = useStore();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const uid = state.currentUserId ?? "USR-08";
  const visible = state.notifications.filter((n) => n.audience.includes(effectiveRole));
  const unread = visible.filter((n) => !n.readBy.includes(uid));
  const isOverridden = state.roleOverride !== null;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
      <MobileTopLogo />

      <form
        className="relative ml-auto w-full max-w-sm lg:ml-0"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search");
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tickets, engineers, customers…"
          aria-label="Global search"
          className="h-9 w-full rounded-lg border border-line bg-surface-alt pl-8.5 pr-14 text-[13px] text-ink placeholder:text-ink-faint focus:border-brand-400 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-faint sm:block">
          ⌘K
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {/* Role switcher */}
        <Dropdown
          width="w-72"
          trigger={(open) => (
            <button
              type="button"
              aria-label="Switch demo role"
              aria-expanded={open}
              className="hidden items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink sm:flex"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-brand-600" aria-hidden />
              <span className="max-w-32 truncate">{ROLE_LABELS[effectiveRole]}</span>
              {isOverridden && <span className="h-1.5 w-1.5 rounded-full bg-warning-500" aria-hidden />}
              <ChevronDown className="h-3 w-3 text-ink-faint" aria-hidden />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>Preview as role</MenuLabel>
              {ROLE_ORDER.map((role) => (
                <MenuItem
                  key={role}
                  active={role === effectiveRole}
                  onClick={() => {
                    setRoleOverride(role === currentUser?.role ? null : role);
                    close();
                    router.push("/dashboard");
                    toast(`Viewing as ${ROLE_LABELS[role]}`, {
                      description: "Demo role override — navigation and permissions update instantly.",
                      tone: "info",
                    });
                  }}
                >
                  <span className="flex-1">{ROLE_LABELS[role]}</span>
                  {role === effectiveRole && <Check className="h-3.5 w-3.5 text-brand-600" aria-hidden />}
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem
                onClick={() => {
                  setRoleOverride(null);
                  close();
                  router.push("/dashboard");
                  toast("Role restored");
                }}
              >
                Reset to my account role
              </MenuItem>
            </>
          )}
        </Dropdown>

        {/* Notifications */}
        <Dropdown
          width="w-[min(92vw,360px)]"
          trigger={(open) => (
            <button
              type="button"
              aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ""}`}
              aria-expanded={open}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-alt hover:text-ink"
            >
              <Bell className="h-4.5 w-4.5" aria-hidden />
              {unread.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[9px] font-bold text-white">
                  {unread.length > 9 ? "9+" : unread.length}
                </span>
              )}
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="flex items-center justify-between px-3 pb-1 pt-2">
                <p className="text-[13px] font-semibold text-ink">Notifications</p>
                {unread.length > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsRead()}
                    className="text-[11px] font-medium text-brand-700 hover:text-brand-800"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {visible.length === 0 ? (
                <p className="px-3 py-6 text-center text-[13px] text-ink-muted">
                  Nothing for this role yet.
                </p>
              ) : (
                <ul className="max-h-80 overflow-y-auto">
                  {visible.slice(0, 6).map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          markNotificationRead(n.id);
                          close();
                          if (n.ticketRef) router.push("/notifications");
                        }}
                        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-alt"
                      >
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                            n.readBy.includes(uid) ? "bg-line-strong" : "bg-brand-500"
                          }`}
                          aria-hidden
                        />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[12px] font-semibold text-ink">{n.title}</span>
                            <span className="shrink-0 text-[10px] text-ink-faint">{relativeTime(n.createdAt)}</span>
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-[11px] leading-4 text-ink-muted">
                            {n.body}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <MenuSeparator />
              <Link
                href="/notifications"
                onClick={close}
                className="flex items-center justify-center px-3 py-2 text-[12px] font-medium text-brand-700 hover:bg-surface-alt"
              >
                View notification centre
              </Link>
            </>
          )}
        </Dropdown>

        {/* Profile */}
        <Dropdown
          width="w-64"
          trigger={(open) => (
            <button
              type="button"
              aria-label="Account menu"
              aria-expanded={open}
              className="flex items-center gap-2 rounded-lg p-1 pr-1.5 transition-colors hover:bg-surface-alt"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                style={{ backgroundColor: currentUser?.avatarColor ?? "#2554e0" }}
              >
                {initials(currentUser?.name ?? "RAYVIQ User")}
              </span>
              <ChevronDown className="hidden h-3 w-3 text-ink-faint sm:block" aria-hidden />
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="border-b border-line px-3 pb-2.5 pt-2">
                <p className="truncate text-[13px] font-semibold text-ink">{currentUser?.name ?? "Demo user"}</p>
                <p className="truncate text-[11px] text-ink-muted">{currentUser?.email ?? "—"}</p>
                <div className="mt-1.5">
                  <Badge tone="blue">{ROLE_LABELS[effectiveRole]}</Badge>
                </div>
              </div>
              <MenuItem
                onClick={() => {
                  close();
                  router.push("/settings");
                }}
              >
                <UserRound className="h-3.5 w-3.5" aria-hidden /> Profile & preferences
              </MenuItem>
              <MenuItem
                onClick={() => {
                  close();
                  router.push("/settings");
                }}
              >
                <Settings className="h-3.5 w-3.5" aria-hidden /> Workspace settings
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                onClick={() => {
                  close();
                  router.push("/login");
                }}
              >
                Switch demo account
              </MenuItem>
              <MenuItem
                danger
                onClick={() => {
                  close();
                  logout();
                  toast("Signed out", { tone: "info" });
                  router.push("/login");
                }}
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
              </MenuItem>
            </>
          )}
        </Dropdown>
      </div>
    </header>
  );
}
