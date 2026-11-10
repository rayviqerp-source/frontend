"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Timer,
  UsersRound,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { cn, initials } from "@/lib/utils";

const DEMO_ACCOUNTS = [
  { id: "USR-01", email: "priya@voltrix.example", password: "demo1234" },
  { id: "USR-02", email: "rohan@voltrix.example", password: "demo1234" },
  { id: "USR-03", email: "ananya@voltrix.example", password: "demo1234" },
  { id: "USR-04", email: "vikram@brightfield.example", password: "demo1234" },
  { id: "USR-05", email: "neha@brightfield.example", password: "demo1234" },
  { id: "USR-06", email: "arjun@rayviq.example", password: "demo1234" },
  { id: "USR-07", email: "kavita@rayviq.example", password: "demo1234" },
  { id: "USR-08", email: "sameer@rayviq.example", password: "demo1234" },
];

const HIGHLIGHTS = [
  {
    icon: LayoutDashboard,
    title: "Ticket command centre",
    text: "Triage, assign and close jobs across the full 15-status workflow.",
  },
  {
    icon: Timer,
    title: "SLA & escalation radar",
    text: "Response clocks, breach alerts and escalation paths per priority.",
  },
  {
    icon: UsersRound,
    title: "Roles that fit your team",
    text: "OEM admins, service managers, partners, engineers and platform staff.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, state, toast } = useStore();
  const [email, setEmail] = useState("priya@voltrix.example");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    window.setTimeout(() => {
      const match = state.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
      );
      if (!match) {
        setError("No demo account found for this email. Use one of the demo accounts below.");
        setLoading(false);
        return;
      }
      if (password.length < 4) {
        setError("Password must be at least 4 characters (demo: any password works).");
        setLoading(false);
        return;
      }
      login(match.id);
      toast(`Welcome back, ${match.name.split(" ")[0]}`, {
        description: `Signed in as ${ROLE_LABELS[match.role]}.`,
      });
      router.push("/dashboard");
    }, 450);
  };

  const quickSignIn = (userId: string) => {
    const user = state.users.find((u) => u.id === userId);
    if (!user) return;
    login(userId);
    toast(`Signed in as ${ROLE_LABELS[user.role]}`, { tone: "info" });
    router.push("/dashboard");
  };

  return (
    <div className="w-full max-w-5xl">
      {/* ---------------- Hero + sign-in ---------------- */}
      <section className="relative overflow-hidden rounded-3xl bg-ink shadow-pop">
        {/* glows + grid */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-brand-600/40 blur-3xl" />
          <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-accent-500/15 blur-3xl" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage:
                "radial-gradient(ellipse 80% 70% at 50% 0%, black 40%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 80% 70% at 50% 0%, black 40%, transparent 100%)",
            }}
          />
        </div>

        <div className="relative grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_380px] lg:items-center lg:gap-10 lg:p-12">
          {/* Copy */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/90 ring-1 ring-white/20 backdrop-blur">
              <Building2 className="h-3.5 w-3.5 text-brand-300" aria-hidden />
              RAYVIQ workspace
            </span>

            <h1 className="mt-4 text-balance text-2xl font-semibold leading-[1.15] tracking-tight text-white sm:text-3xl lg:text-4xl">
              Service operations,{" "}
              <span className="bg-gradient-to-r from-brand-200 via-white to-brand-300 bg-clip-text text-transparent">
                all in one workspace
              </span>
            </h1>
            <p className="mt-3 max-w-lg text-pretty text-[14px] leading-6 text-white/70 sm:text-[15px] sm:leading-7">
              One secure sign-in for OEM teams and service partners — run tickets,
              engineers, AMC visits and SLAs without switching tools.
            </p>

            <ul className="mt-5 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {HIGHLIGHTS.map((h) => (
                <li
                  key={h.title}
                  className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur-sm"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card">
                    <h.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="mt-2 text-[13px] font-semibold text-white">{h.title}</p>
                  <p className="mt-0.5 text-[12px] leading-5 text-white/60">{h.text}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Sign-in card */}
          <div className="rounded-2xl bg-surface p-5 shadow-2xl shadow-black/40 ring-1 ring-black/5 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              Sign in to your workspace
            </h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              Use a demo account below, or enter any 4+ character password.
            </p>

            <form onSubmit={submit} className="mt-4 space-y-3.5">
              <Input
                label="Work email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error || undefined}
                placeholder="you@company.example"
              />
              <Input
                label="Password"
                hint="Demo: any 4+ characters"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-600 hover:text-brand-700"
                >
                  <KeyRound className="h-3.5 w-3.5" /> Forgot password?
                </Link>
                <Link
                  href="/verify-email"
                  className="text-[13px] font-medium text-ink-muted hover:text-ink"
                >
                  Verify email
                </Link>
              </div>
              <Button type="submit" size="lg" loading={loading} className="w-full">
                Sign in <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <p className="mt-4 border-t border-line pt-3.5 text-center text-[13px] text-ink-muted">
              New here — OEM, service partner or field engineer?{" "}
              <Link
                href="/register"
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- One-click demo accounts ---------------- */}
      <section className="mt-5 rounded-2xl border border-accent-300/50 bg-accent-100/40 p-4 sm:p-5">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-accent-600">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> One-click demo accounts
        </p>
        <p className="mt-1 text-[12px] leading-5 text-ink-muted">
          Tap a role to sign in instantly and land on its dashboard — no password
          needed.
        </p>

        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((acc, i) => {
            const user = state.users.find((u) => u.id === acc.id);
            if (!user) return null;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => quickSignIn(acc.id)}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white bg-gradient-to-br",
                    i % 2 === 0
                      ? "from-brand-500 to-brand-700"
                      : "from-accent-500 to-brand-600",
                  )}
                  aria-hidden
                >
                  {initials(user.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">
                    {ROLE_LABELS[user.role]}
                  </span>
                  <span className="block truncate text-[11px] text-ink-faint">
                    {user.name} · {user.email}
                  </span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
              </button>
            );
          })}
        </div>
      </section>

      <p className="mt-5 flex items-start gap-1.5 text-xs leading-5 text-ink-faint">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Demo authentication only. Client-side role checks are not security — real
        enforcement belongs on the backend.
      </p>
    </div>
  );
}
