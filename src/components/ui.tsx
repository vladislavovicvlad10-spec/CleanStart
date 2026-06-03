import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { Check, Search } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import type { Accent } from "../types/app";

const accentText: Record<Accent, string> = {
  blue: "text-blue-600",
  purple: "text-violet-600",
  orange: "text-orange-500",
  green: "text-emerald-600",
  slate: "text-slate-600",
};

const accentBg: Record<Accent, string> = {
  blue: "from-blue-50 to-sky-100",
  purple: "from-violet-50 to-purple-100",
  orange: "from-orange-50 to-amber-100",
  green: "from-emerald-50 to-green-100",
  slate: "from-slate-50 to-blue-50",
};

const buttonBg: Record<Accent, string> = {
  blue: "from-blue-500 to-blue-700 hover:from-blue-500 hover:to-blue-600",
  purple: "from-violet-500 to-purple-700 hover:from-violet-500 hover:to-purple-600",
  orange: "from-orange-400 to-orange-600 hover:from-orange-400 hover:to-orange-500",
  green: "from-emerald-400 to-teal-600 hover:from-emerald-400 hover:to-teal-500",
  slate: "from-slate-500 to-slate-700 hover:from-slate-500 hover:to-slate-600",
};

export function GlassCard({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...props}
      className={clsx(
        "rounded-glass border border-white/70 bg-white/70 shadow-glass backdrop-blur-xl",
        "ring-1 ring-blue-100/70",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function IconBubble({
  icon: Icon,
  accent = "blue",
  size = "md",
}: {
  icon: LucideIcon;
  accent?: Accent;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={clsx(
        "grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br shadow-soft",
        accentBg[accent],
        size === "sm" && "h-10 w-10",
        size === "md" && "h-12 w-12",
        size === "lg" && "h-16 w-16",
      )}
    >
      <Icon className={clsx(size === "lg" ? "h-8 w-8" : "h-6 w-6", accentText[accent])} />
    </span>
  );
}

export function Button({
  children,
  accent = "blue",
  variant = "primary",
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  accent?: Accent;
  variant?: "primary" | "secondary" | "danger";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300";
  if (variant === "secondary") {
    return (
      <button
        className={clsx(
          base,
          "border border-blue-100 bg-white/80 text-blue-700 shadow-soft hover:bg-blue-50",
          className,
        )}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }
  if (variant === "danger") {
    return (
      <button
        className={clsx(
          base,
          "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-soft hover:from-rose-500 hover:to-red-500 disabled:opacity-50",
          className,
        )}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      className={clsx(
        base,
        "bg-gradient-to-r text-white shadow-soft hover:-translate-y-0.5 disabled:opacity-50",
        buttonBg[accent],
        className,
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  testId,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      data-testid={testId}
      aria-checked={checked}
      aria-label={label ?? "Toggle setting"}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative h-9 w-[66px] rounded-full border p-1 transition-all duration-200",
        checked
          ? "border-blue-400 bg-gradient-to-r from-blue-500 to-blue-700"
          : "border-slate-200 bg-slate-300",
      )}
    >
      <span
        className={clsx(
          "block h-7 w-7 rounded-full bg-white shadow-md transition-transform duration-200",
          checked ? "translate-x-7" : "translate-x-0",
        )}
      />
    </button>
  );
}

export function StatusBadge({
  label,
  tone = "blue",
}: {
  label: string;
  tone?: Accent;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        tone === "green" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "orange" && "border-orange-200 bg-orange-50 text-orange-700",
        tone === "purple" && "border-violet-200 bg-violet-50 text-violet-700",
        tone === "blue" && "border-blue-200 bg-blue-50 text-blue-700",
        tone === "slate" && "border-slate-200 bg-slate-50 text-slate-700",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex h-10 min-w-[270px] items-center gap-3 rounded-2xl border border-blue-100 bg-white/75 px-4 shadow-soft">
      <Search className="h-4 w-4 text-slate-500" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
      />
    </label>
  );
}

export function SafetyBanner({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/75 text-emerald-800 shadow-soft",
        compact ? "px-3 py-2 text-sm" : "px-5 py-4",
      )}
    >
      <span
        className={clsx(
          "grid shrink-0 place-items-center bg-emerald-100 text-emerald-700",
          compact ? "h-8 w-8 rounded-xl" : "h-10 w-10 rounded-2xl",
        )}
      >
        <Check className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </span>
      <div>{children}</div>
    </div>
  );
}

export function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white/65">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-blue-50/80 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-100/80 text-slate-700">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="transition-colors hover:bg-blue-50/45">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
