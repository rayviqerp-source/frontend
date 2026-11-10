"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { key: string; label: string; count?: number; icon?: ReactNode }[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1 overflow-x-auto border-b border-line no-scrollbar", className)} role="tablist">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-[13px] font-medium transition-colors",
              isActive ? "text-brand-700" : "text-ink-muted hover:text-ink",
            )}
          >
            {t.icon}
            {t.label}
            {typeof t.count === "number" && (
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-px text-[11px] font-semibold",
                  isActive ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-ink-muted",
                )}
              >
                {t.count}
              </span>
            )}
            {isActive && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Dropdown({
  trigger,
  children,
  align = "right",
  width = "w-56",
}: {
  trigger: (open: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-40 mt-2 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop animate-fade-in",
            align === "right" ? "right-0" : "left-0",
            width,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  active,
  danger,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors",
        danger ? "text-danger-600 hover:bg-danger-50" : "text-ink-soft hover:bg-surface-alt hover:text-ink",
        active && "bg-brand-50 text-brand-700",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
      {children}
    </p>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-line" />;
}
