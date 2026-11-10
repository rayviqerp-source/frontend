import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface p-1 ring-1 ring-line shadow-card">
        <BrandLogo variant="mark" href={null} imgClassName="h-12 w-12 rounded-xl" priority />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Page not found</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved. Check the URL,
        or head back to your workspace.
      </p>
      <div className="mt-6 flex gap-2">
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Go to dashboard
        </Link>
        <Link
          href="/login"
          className="inline-flex h-10 items-center rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
