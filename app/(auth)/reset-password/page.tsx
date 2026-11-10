"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Card } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div>
        <Card className="p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success-600" />
          <h1 className="mt-3 text-lg font-semibold text-ink">Password updated</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Demo only — no credentials were actually changed.
          </p>
          <Button className="mt-4" size="lg" onClick={() => router.push("/login")}>
            Continue to sign in
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
          <Lock className="h-5 w-5 text-brand-600" /> Choose a new password
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Your reset link is valid for 30 minutes.
        </p>
      </div>
      <Card className="p-5">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (password.length < 8) return setError("Minimum 8 characters");
            if (password !== confirm) return setError("Passwords do not match");
            setError("");
            setDone(true);
          }}
        >
          <Input
            label="New password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error || undefined}
          />
          <Input
            label="Confirm password"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <Button type="submit" size="lg" className="w-full">
            Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}
