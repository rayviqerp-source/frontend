"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowRight, MailOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setDigit = (i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    setError("");
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };

  const code = otp.join("");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Verify your email</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Enter the 6-digit code we sent to your inbox. Demo code:{" "}
          <strong className="font-mono text-ink">123456</strong>
        </p>
      </div>
      <Card className="p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code !== "123456") {
              setError("Incorrect code — use 123456 in this demo.");
              return;
            }
            router.push("/login");
          }}
        >
          <div className="flex justify-between gap-2" role="group" aria-label="Verification code">
            {otp.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus();
                }}
                inputMode="numeric"
                aria-label={`Digit ${i + 1}`}
                className="h-12 w-11 rounded-lg border border-line-strong bg-surface text-center text-lg font-semibold text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            ))}
          </div>
          {error && <p className="mt-2 text-xs text-danger-600">{error}</p>}
          <Button type="submit" size="lg" className="mt-4 w-full">
            Verify email <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-[13px]">
          <span className="inline-flex items-center gap-1.5 text-ink-muted">
            <MailOpen className="h-3.5 w-3.5" /> No real email is sent
          </span>
          <button
            type="button"
            className="font-medium text-brand-600 hover:text-brand-700"
            onClick={() => setOtp(["1", "2", "3", "4", "5", "6"])}
          >
            Autofill demo code
          </button>
        </div>
      </Card>
      <p className="mt-4 text-[13px] text-ink-muted">
        Changed your mind?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
