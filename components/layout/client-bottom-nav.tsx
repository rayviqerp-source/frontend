"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/client", label: "Home", icon: "home" },
  { href: "/client/bookings", label: "Bookings", icon: "bookings" },
  { href: "/marketplace", label: "Experts", icon: "experts" },
  { href: "/client/profile", label: "My Profile", icon: "profile" },
] as const;

function TabIcon({ name }: { name: (typeof TABS)[number]["icon"] }) {
  const cls = "h-4 w-4";
  if (name === "home") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={cls}>
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    );
  }
  if (name === "bookings") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={cls}>
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    );
  }
  if (name === "experts") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={cls}>
        <path d="M14.7 6.3a4 4 0 105.6 5.6l-8.4 8.4a2.1 2.1 0 01-3-3l8.4-8.4z" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={cls}>
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

/** Bottom navigation for the customer-facing client app (mobile only). */
export function ClientBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/client" ? pathname === "/client" : pathname.startsWith(href);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex h-[64px] border-t border-line bg-surface/95 backdrop-blur-md sm:hidden"
      aria-label="Client navigation"
    >
      <div className="flex w-full items-stretch justify-around px-2">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium",
                active ? "text-brand-600" : "text-ink-faint",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-9 items-center justify-center rounded-full transition-colors",
                  active ? "bg-brand-50 text-brand-600" : "text-ink-faint",
                )}
              >
                <TabIcon name={tab.icon} />
              </span>
              <span className={cn("leading-none", active && "font-semibold")}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
