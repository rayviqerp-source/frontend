"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { LoadingScreen } from "@/components/ui/states";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ready, currentUser } = useStore();

  useEffect(() => {
    if (ready && !currentUser) router.replace("/login");
  }, [ready, currentUser, router]);

  if (!ready || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <LoadingScreen label="Preparing your workspace…" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Desktop sidebar (hidden on mobile) */}
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1">
          <div
            className={cn(
              "mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7",
              /* bottom nav offset on mobile */
              "pb-[90px] sm:pb-0"
            )}
          >
            {children}
          </div>
        </main>
        <footer className="border-t border-line px-4 py-3 text-center text-[11px] text-ink-faint sm:px-6">
          RAYVIQ demo · Simulated service data — no real emails, SMS, payments or warranty decisions.
        </footer>
      </div>
    </div>
  );
}
