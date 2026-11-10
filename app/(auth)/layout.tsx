import { ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-canvas">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_85%_-10%,#dbe7ff_0%,transparent_60%),radial-gradient(45rem_30rem_at_-10%_110%,#cffafe_0%,transparent_55%)]"
      />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <BrandLogo href="/" priority />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-3 py-1 text-[11px] font-medium text-ink-muted backdrop-blur">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-600" aria-hidden />
          Demo environment
        </span>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-12 pt-2 sm:px-6">
        {children}
      </main>
      <footer className="relative z-10 px-6 pb-6 text-center text-[11px] text-ink-faint sm:px-10">
        RAYVIQ service coordination platform · Simulated data only — no real emails, SMS or payments.
      </footer>
    </div>
  );
}
