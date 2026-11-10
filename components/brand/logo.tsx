import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  /** `full` shows the RAYVIQ wordmark, `mark` shows only the R symbol. */
  variant?: "full" | "mark";
  /** Pass `null` to render without a link. */
  href?: string | null;
  /** Extra classes for the outer wrapper. */
  className?: string;
  /** Extra classes for the image itself (height overrides etc.). */
  imgClassName?: string;
  /** Optional secondary label shown next to the wordmark (e.g. "Marketplace"). */
  label?: string;
  priority?: boolean;
};

/**
 * Single source of truth for the RAYVIQ brand mark.
 * Uses the real logo files in `public/` so every surface stays consistent.
 */
export function BrandLogo({
  variant = "full",
  href = "/",
  className,
  imgClassName,
  label,
  priority = false,
}: BrandLogoProps) {
  const isMark = variant === "mark";

  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src={isMark ? "/logo-mark.png" : "/logo.jpg"}
        alt="RAYVIQ"
        width={isMark ? 280 : 1600}
        height={isMark ? 280 : 533}
        priority={priority}
        className={cn(
          isMark ? "h-8 w-8 rounded-md object-cover" : "h-8 w-auto mix-blend-multiply",
          imgClassName,
        )}
      />
      {label && (
        <span className="hidden text-[13px] text-ink-muted sm:inline">{label}</span>
      )}
    </span>
  );

  if (href === null) return content;

  return (
    <Link href={href} aria-label="RAYVIQ home" className="inline-flex items-center">
      {content}
    </Link>
  );
}
