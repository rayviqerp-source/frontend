"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Clock3,
  KeyRound,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  UserPlus,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { cn, initials } from "@/lib/utils";

const FEATURES = [
  {
    icon: Wrench,
    title: "Verified engineers",
    text: "Background-checked, certified solar technicians near you.",
  },
  {
    icon: Clock3,
    title: "Live visit tracking",
    text: "Follow every booking from assignment to sign-off in real time.",
  },
  {
    icon: ShieldCheck,
    title: "Service history",
    text: "Reports, parts and warranty notes stay attached to your site.",
  },
];

type Mode = "signin" | "signup";

/**
 * Client (customer) sign-in & sign-up — end customers only.
 * The account is created locally in the demo store and signs the customer in.
 */
export default function ClientLoginPage() {
  const router = useRouter();
  const { state, portalLogin, registerCustomer, toast } = useStore();

  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* sign-in fields */
  const [phone, setPhone] = useState("");

  /* sign-up fields */
  const [name, setName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
  };

  const signIn = (id: string, displayName: string) => {
    portalLogin(id);
    toast(`Welcome, ${displayName.split(" ")[0]}`, {
      description: "Signed in to your RAYVIQ account.",
    });
    router.push("/client");
  };

  const submitSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const q = phone.trim().toLowerCase();
    if (!q) return;

    const match = state.customers.find(
      (c) =>
        c.phone.toLowerCase().replace(/\s+/g, "") === q.replace(/\s+/g, "") ||
        (c.email ?? "").toLowerCase() === q,
    );

    if (!match) {
      setError("No account found with that number or email. Create one below.");
      return;
    }

    setError("");
    setLoading(true);
    window.setTimeout(() => signIn(match.id, match.name), 400);
  };

  const submitSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPhone = signupPhone.trim();
    const cleanName = name.trim();
    const cleanCity = city.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (cleanPhone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!cleanCity) {
      setError("Please enter your city.");
      return;
    }

    const digits = cleanPhone.replace(/\s+/g, "");
    const duplicate = state.customers.find(
      (c) =>
        c.phone.replace(/\s+/g, "") === digits ||
        (cleanEmail && (c.email ?? "").toLowerCase() === cleanEmail),
    );
    if (duplicate) {
      setError("An account already exists with this number or email — sign in instead.");
      return;
    }

    setLoading(true);
    window.setTimeout(() => {
      registerCustomer({
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail || undefined,
        city: cleanCity,
        company: cleanName,
      });
      setLoading(false);
      toast(`Welcome, ${cleanName.split(" ")[0]}`, {
        description: "Your RAYVIQ account is ready.",
      });
      router.push("/client");
    }, 450);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* ---------------- Hero + auth card ---------------- */}
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
              <UserRound className="h-3.5 w-3.5 text-brand-300" aria-hidden />
              RAYVIQ customer app
            </span>

            <h1 className="mt-4 text-balance text-2xl font-semibold leading-[1.15] tracking-tight text-white sm:text-3xl lg:text-4xl">
              Book &amp; track solar inverter repairs,{" "}
              <span className="bg-gradient-to-r from-brand-200 via-white to-brand-300 bg-clip-text text-transparent">
                without the runaround
              </span>
            </h1>
            <p className="mt-3 max-w-lg text-pretty text-[14px] leading-6 text-white/70 sm:text-[15px] sm:leading-7">
              Create your account or sign in to raise a service request, follow a
              verified engineer to your site, and keep every report in one place.
            </p>

            <ul className="mt-5 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {FEATURES.map((f) => (
                <li
                  key={f.title}
                  className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur-sm"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card">
                    <f.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="mt-2 text-[13px] font-semibold text-white">{f.title}</p>
                  <p className="mt-0.5 text-[12px] leading-5 text-white/60">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Auth card */}
          <div className="rounded-2xl bg-surface p-5 shadow-2xl shadow-black/40 ring-1 ring-black/5 sm:p-6">
            {/* Mode toggle */}
            <div
              className="grid grid-cols-2 gap-1 rounded-xl bg-surface-alt p-1 ring-1 ring-line"
              role="tablist"
              aria-label="Sign in or create account"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signin"}
                onClick={() => switchMode("signin")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                  mode === "signin"
                    ? "bg-surface text-ink shadow-card"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                <UserRound className="h-3.5 w-3.5" aria-hidden /> Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                onClick={() => switchMode("signup")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                  mode === "signup"
                    ? "bg-surface text-ink shadow-card"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden /> Create account
              </button>
            </div>

            {mode === "signin" ? (
              <>
                <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink">
                  Welcome back
                </h2>
                <p className="mt-1 text-[13px] text-ink-muted">
                  Sign in with your registered mobile number or email.
                </p>

                <form onSubmit={submitSignIn} className="mt-4 space-y-3.5">
                  <div>
                    <Label htmlFor="client-id" required>
                      Mobile number or email
                    </Label>
                    <div className="relative">
                      <Phone
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                        aria-hidden
                      />
                      <input
                        id="client-id"
                        type="text"
                        autoComplete="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98870 51001"
                        className={cn(
                          "h-11 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint transition-shadow focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100",
                          error &&
                            "border-danger-500 focus:border-danger-500 focus:ring-danger-100",
                        )}
                      />
                    </div>
                    {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
                  </div>

                  <Button type="submit" size="lg" loading={loading} className="w-full">
                    Sign in <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5 text-[12px]">
                  <Link
                    href="/forgot-password"
                    className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Forgot password?
                  </Link>
                  <span className="text-ink-faint">Demo · no OTP is sent</span>
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink">
                  Create your account
                </h2>
                <p className="mt-1 text-[13px] text-ink-muted">
                  Free to join — book and track repairs in seconds.
                </p>

                <form onSubmit={submitSignUp} className="mt-4 space-y-3">
                  <div>
                    <Label htmlFor="su-name" required>
                      Full name
                    </Label>
                    <div className="relative">
                      <UserRound
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                        aria-hidden
                      />
                      <input
                        id="su-name"
                        type="text"
                        autoComplete="name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="h-11 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint transition-shadow focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="su-phone" required>
                      Mobile number
                    </Label>
                    <div className="relative">
                      <Phone
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                        aria-hidden
                      />
                      <input
                        id="su-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        value={signupPhone}
                        onChange={(e) => setSignupPhone(e.target.value)}
                        placeholder="+91 98870 51001"
                        className="h-11 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint transition-shadow focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="su-email">Email</Label>
                      <input
                        id="su-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-faint transition-shadow focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="su-city" required>
                        City
                      </Label>
                      <div className="relative">
                        <MapPin
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                          aria-hidden
                        />
                        <input
                          id="su-city"
                          type="text"
                          autoComplete="address-level2"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Jaipur"
                          className="h-11 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint transition-shadow focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        />
                      </div>
                    </div>
                  </div>

                  {error && <p className="text-xs text-danger-600">{error}</p>}

                  <Button type="submit" size="lg" loading={loading} className="w-full">
                    Create account <ArrowRight className="h-4 w-4" />
                  </Button>

                  <p className="text-center text-[11px] leading-4 text-ink-faint">
                    By continuing you agree to the demo terms — this is a demo, no
                    real account or message is created.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- Demo identities (sign-in only) ---------------- */}
      {mode === "signin" && (
        <section className="rounded-2xl border border-accent-300/50 bg-accent-100/40 p-4 sm:p-5">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-accent-600">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> One-tap demo customers
          </p>
          <p className="mt-1 text-[12px] leading-5 text-ink-muted">
            Tap an account to sign in instantly — no OTP is sent in the demo.
          </p>

          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {state.customers.slice(0, 6).map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => signIn(c.id, c.name)}
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
                  {initials(c.company ?? c.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">
                    {c.company ?? c.name}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-faint">
                    <Phone className="h-3 w-3 shrink-0" /> {c.phone}
                    <MapPin className="ml-1 h-3 w-3 shrink-0" /> {c.city}
                  </span>
                </span>
                <Badge tone="blue" className="hidden shrink-0 sm:inline-flex">
                  {c.type.replace(/_/g, " ")}
                </Badge>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="flex items-start gap-1.5 text-xs leading-5 text-ink-faint">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Demo authentication only — signing in or creating an account stays in your
        browser and no real SMS or email is sent.
      </p>
    </div>
  );
}
