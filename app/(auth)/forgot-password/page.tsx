"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Card } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Reset your password</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Enter your work email and we&apos;ll send a reset link (demo only).
        </p>
      </div>
      <Card className="p-5">
        {sent ? (
          <div className="text-center">
            <MailCheck className="mx-auto h-10 w-10 text-success-600" />
            <p className="mt-3 text-sm font-medium text-ink">Reset link queued</p>
            <p className="mt-1 text-[13px] leading-5 text-ink-muted">
              If <strong className="text-ink">{email}</strong> exists, a reset link would arrive
              shortly. No real email is sent in this demo.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => setSent(false)}>
              Try another email
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
                setError("Enter a valid email address");
                return;
              }
              setError("");
              setSent(true);
            }}
          >
            <Input
              label="Work email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error || undefined}
              placeholder="you@company.example"
            />
            <Button type="submit" size="lg" className="w-full">
              Send reset link
            </Button>
          </form>
        )}
      </Card>
      <Link
        href="/login"
        className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-600 hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </Link>
    </div>
  );
}
