"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const baseInput =
  "w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-faint " +
  "transition-shadow focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-surface-alt disabled:text-ink-muted";

export function Label({
  children,
  htmlFor,
  required,
  hint,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-1.5 flex items-baseline justify-between gap-2", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
        {children}
        {required && <span className="ml-0.5 text-danger-500">*</span>}
      </label>
      {hint && <span className="text-xs text-ink-faint">{hint}</span>}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, id, className, required, ...rest }: InputProps) {
  const inputId = id ?? rest.name;
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={inputId} required={required} hint={hint}>
          {label}
        </Label>
      )}
      <input
        id={inputId}
        required={required}
        className={cn(baseInput, "h-9.5", error && "border-danger-500 focus:border-danger-500 focus:ring-danger-100")}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({ label, hint, error, id, className, required, ...rest }: TextareaProps) {
  const inputId = id ?? rest.name;
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={inputId} required={required} hint={hint}>
          {label}
        </Label>
      )}
      <textarea
        id={inputId}
        required={required}
        className={cn(baseInput, "min-h-24 py-2 leading-6", error && "border-danger-500")}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Optional optgroup name — consecutive options with the same group render together. */
  group?: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  hint,
  error,
  id,
  className,
  options,
  placeholder,
  required,
  ...rest
}: SelectProps) {
  const inputId = id ?? rest.name;

  /* group consecutive options that share a `group` name */
  const groups: { name?: string; items: SelectOption[] }[] = [];
  options.forEach((o) => {
    const last = groups[groups.length - 1];
    if (last && last.name === o.group) last.items.push(o);
    else groups.push({ name: o.group, items: [o] });
  });

  const renderOptions = (items: SelectOption[]) =>
    items.map((o) => (
      <option key={o.value} value={o.value} disabled={o.disabled}>
        {o.label}
      </option>
    ));

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={inputId} required={required} hint={hint}>
          {label}
        </Label>
      )}
      <select
        id={inputId}
        required={required}
        className={cn(baseInput, "h-9.5 appearance-none pr-8", error && "border-danger-500")}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {groups.map((g, i) =>
          g.name ? (
            <optgroup key={`${g.name}-${i}`} label={g.name}>
              {renderOptions(g.items)}
            </optgroup>
          ) : (
            renderOptions(g.items)
          ),
        )}
      </select>
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  );
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label required={required} hint={hint}>
        {label}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-ink">{label}</span>}
          {description && (
            <span className="mt-0.5 block text-[13px] leading-5 text-ink-muted">{description}</span>
          )}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5.5 w-10 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand-600" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-line-strong text-brand-600 accent-brand-600"
      />
      <span className="text-[13px] leading-5 text-ink-soft">{label}</span>
    </label>
  );
}

export function FileUpload({
  label,
  hint,
  multiple,
  onFiles,
  accept = "image/*,.pdf",
}: {
  label?: string;
  hint?: string;
  multiple?: boolean;
  onFiles: (names: string[]) => void;
  accept?: string;
}) {
  return (
    <div>
      {label && <Label hint={hint}>{label}</Label>}
      <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong bg-surface-alt px-4 py-5 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/40">
        <span className="text-[13px] font-medium text-ink">Click to attach files</span>
        <span className="text-xs text-ink-faint">
          Photos, PDFs — stored locally in this demo only
        </span>
        <input
          type="file"
          className="sr-only"
          multiple={multiple}
          accept={accept}
          onChange={(e) => {
            const names = Array.from(e.target.files ?? []).map((f) => f.name);
            if (names.length) onFiles(names);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
