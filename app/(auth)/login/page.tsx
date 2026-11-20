"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { googleSignIn, loginWithPassword } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { cn, initials } from "@/lib/utils";

/** Public OAuth client ID — a missing value hides the Google option. */
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
        cancel_callback?: () => void;
      }) => void;
      renderButton: (
        container: HTMLElement,
        config: { theme: string; size: string; text: string; shape: string; width: number },
      ) => void;
    };
  };
};

const DEMO_ACCOUNTS = [
  { id: "USR-01", email: "priya@voltrix.example", password: "demo1234" },
  { id: "USR-02", email: "rohan@voltrix.example", password: "demo1234" },
  { id: "USR-03", email: "ananya@voltrix.example", password: "demo1234" },
  { id: "USR-04", email: "vikram@sunce.example", password: "demo1234" },
  { id: "USR-05", email: "neha@sunce.example", password: "demo1234" },
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
  const { login, loginRemoteUser, state, toast, portalLogin, registerCustomer } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* ---- Google Sign-In (customers land in the client app) ---- */
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const gsiInitializedRef = useRef(false);
  const [googleScriptFailed, setGoogleScriptFailed] = useState(false);

  const completeGoogleSignIn = useCallback(
    async (idToken: string) => {
      setLoading(true);
      setError("");
      try {
        const result = await googleSignIn(idToken);
        const emailAddress = result.profile.email.toLowerCase();
        const existing = state.customers.find(
          (c) => (c.email ?? "").toLowerCase() === emailAddress,
        );
        if (existing) {
          portalLogin(existing.id);
          toast(`Welcome, ${existing.name.split(" ")[0]}`, {
            description: "Signed in with Google.",
          });
        } else {
          const created = registerCustomer({
            name: result.profile.name,
            email: emailAddress,
            phone: "",
            city: "",
          });
          toast(`Welcome, ${created.name.split(" ")[0]}`, {
            description: "Account created with Google.",
          });
        }
        router.push("/client");
      } catch (err) {
        setLoading(false);
        setError(err instanceof Error ? err.message : "Google Sign-In failed. Please try again.");
      }
    },
    [state.customers, portalLogin, registerCustomer, toast, router],
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let active = true;
    const setup = () => {
      const g = (window as Window & { google?: GoogleIdentity }).google;
      if (!active || !g || !googleButtonRef.current) return false;
      try {
        g.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (!response.credential) {
              setLoading(false);
              setError("Google sign-in was cancelled. Please try again.");
              return;
            }
            void completeGoogleSignIn(response.credential);
          },
          cancel_callback: () => {
            setLoading(false);
            setError("Google sign-in was cancelled. Please try again.");
          },
        });
        g.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: 320,
        });
        return true;
      } catch {
        setGoogleScriptFailed(true);
        return false;
      }
    };

    const init = () => {
      if (gsiInitializedRef.current) return;
      if (setup()) gsiInitializedRef.current = true;
    };
    const w = window as Window & { google?: GoogleIdentity };
    if (w.google) {
      init();
      return () => {
        active = false;
      };
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = init;
    script.onerror = () => setGoogleScriptFailed(true);
    document.body.appendChild(script);
    return () => {
      active = false;
    };
  }, [completeGoogleSignIn]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const emailValue = email.trim();

    try {
      /* Registered accounts are verified against MongoDB via the backend. */
      const session = await loginWithPassword(emailValue, password);
      if (session) {
        const profile = session.user;
        const user = loginRemoteUser({
          email: profile.email ?? emailValue,
          name: profile.name,
          platformRole: profile.platformRole,
          company: profile.company,
        });
        toast(`Welcome back, ${user.name.split(" ")[0]}`, {
          description: `Signed in as ${ROLE_LABELS[user.role]}.`,
        });
        router.push("/dashboard");
        return;
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
      return;
    }

    /* Demo personas stay available without a backend session. */
    const match = state.users.find(
      (u) => u.email.toLowerCase() === emailValue.toLowerCase(),
    );
    if (!match) {
      setError("No account found for this email. Create an account or use a demo account below.");
      setLoading(false);
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      setLoading(false);
      return;
    }
    login(match.id);
    toast(`Welcome back, ${match.name.split(" ")[0]}`, {
      description: `Signed in as ${ROLE_LABELS[match.role]}.`,
    });
    router.push("/dashboard");
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
              Sign in with your registered email and password, or use a demo account below.
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
                hint="Your registered password"
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

            {GOOGLE_CLIENT_ID ? (
              <div className="mt-4">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-line" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                    or
                  </span>
                  <span className="h-px flex-1 bg-line" />
                </div>
                <div ref={googleButtonRef} className="mt-3 flex justify-center" />
                {googleScriptFailed && (
                  <p className="mt-2 text-center text-xs text-danger-600">
                    Google Sign-In could not load. Check your connection and try again.
                  </p>
                )}
                <p className="mt-2 text-center text-[11px] text-ink-faint">
                  Google accounts sign in to the customer app.
                </p>
              </div>
            ) : null}

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
        Registered accounts sign in against the RAYVIQ backend. Demo personas are
        for previewing roles only.
      </p>
    </div>
  );
}
