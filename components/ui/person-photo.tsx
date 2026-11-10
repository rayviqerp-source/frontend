"use client";

import { useState } from "react";
import { cn, initials } from "@/lib/utils";
import { localPhoto, remotePhoto } from "@/lib/photos";

interface PersonPhotoProps {
  /** Engineer id — drives which photo is used. */
  id: string;
  name: string;
  /** Wrapper classes (size + shape), e.g. "h-12 w-12 rounded-full". */
  className?: string;
  /** Brand colour painted behind the photo — doubles as the offline fallback. */
  backgroundColor?: string;
}

/**
 * Avatar with a real face photo layered over the coloured initials badge.
 * Local portraits are used first (offline-friendly); if one is missing we fall
 * back to the remote portrait and finally to the initials badge.
 */
export function PersonPhoto({ id, name, className = "", backgroundColor }: PersonPhotoProps) {
  const bundled = localPhoto(id);
  const [src, setSrc] = useState<string | null>(bundled);
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden font-bold text-white",
        className,
      )}
      style={backgroundColor ? { backgroundColor } : undefined}
      aria-hidden
    >
      {initials(name)}
      {!failed && src && (
        // eslint-disable-next-line @next/next/no-img-element -- demo portraits with a manual fallback chain
        <img
          src={src}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => {
            if (bundled && src === bundled) {
              setSrc(remotePhoto(id));
            } else {
              setFailed(true);
            }
          }}
        />
      )}
    </span>
  );
}
