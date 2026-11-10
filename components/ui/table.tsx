"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)}>{children}</table>
    </div>
  );
}

export function THead({ columns }: { columns: { label: string; className?: string }[] }) {
  return (
    <thead>
      <tr className="border-b border-line bg-surface-alt/70">
        {columns.map((c) => (
          <th
            key={c.label}
            scope="col"
            className={cn(
              "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-muted",
              c.className,
            )}
          >
            {c.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function Tr({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-brand-50/40",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn("px-4 py-3 align-middle text-[13px] text-ink-soft", className)}>
      {children}
    </td>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-muted",
        className,
      )}
    >
      {children}
    </th>
  );
}

/* --------------------------------------------------------------- */

export interface SortState<K extends string> {
  key: K;
  dir: "asc" | "desc";
}

export function useTableControls<T extends object>({
  rows,
  searchKeys,
  initialSort,
  pageSize = 10,
}: {
  rows: T[];
  searchKeys?: (keyof T & string)[];
  initialSort?: SortState<keyof T & string>;
  pageSize?: number;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState<keyof T & string> | null>(initialSort ?? null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    let out = rows;
    const q = query.trim().toLowerCase();
    if (q && searchKeys?.length) {
      out = out.filter((r) =>
        searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q)),
      );
    }
    for (const [k, v] of Object.entries(filters)) {
      if (!v) continue;
      out = out.filter(
        (r) =>
          String((r as Record<string, unknown>)[k] ?? "").toLowerCase() ===
          v.toLowerCase(),
      );
    }
    if (sort) {
      const { key, dir } = sort;
      out = [...out].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av ?? "").localeCompare(String(bv ?? ""));
        return dir === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, query, searchKeys, filters, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: keyof T & string) => {
    setPage(1);
    setSort((s) =>
      s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  };

  const setFilter = (key: string, value: string) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const reset = () => {
    setQuery("");
    setFilters({});
    setPage(1);
    setSort(null);
  };

  return {
    query,
    setQuery: (v: string) => {
      setQuery(v);
      setPage(1);
    },
    page: safePage,
    setPage,
    sort,
    toggleSort,
    filters,
    setFilter,
    reset,
    filtered,
    paged,
    totalPages,
    total: filtered.length,
  };
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9.5 w-full rounded-lg border border-line-strong bg-surface pl-8.5 pr-3 text-sm placeholder:text-ink-faint focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onPage,
  pageSizeLabel,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
  pageSizeLabel?: string;
}) {
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="text-[13px] text-ink-muted">
        Page <span className="font-medium text-ink">{page}</span> of{" "}
        <span className="font-medium text-ink">{totalPages}</span>
        <span className="text-ink-faint"> · {total} records{pageSizeLabel ? ` · ${pageSizeLabel}` : ""}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors hover:bg-surface-alt disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors hover:bg-surface-alt disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function SortHeader<K extends string>({
  label,
  field,
  sort,
  onSort,
  className,
}: {
  label: string;
  field: K;
  sort: SortState<K> | null;
  onSort: (k: K) => void;
  className?: string;
}) {
  const active = sort?.key === field;
  return (
    <th
      scope="col"
      className={cn(
        "cursor-pointer select-none px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-muted hover:text-ink",
        className,
      )}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span aria-hidden className={cn("text-[9px]", active ? "text-brand-600" : "text-ink-faint")}>
          {active ? (sort?.dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </span>
    </th>
  );
}
