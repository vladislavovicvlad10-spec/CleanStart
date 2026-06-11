import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { Check, Loader2, Search, X } from "lucide-react";
import { useEffect, type HTMLAttributes, type ReactNode } from "react";

export type Tone = "accent" | "violet" | "success" | "warning" | "danger" | "neutral";

const toneText: Record<Tone, string> = {
  accent: "text-accent",
  violet: "text-violet",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-muted",
};

const toneSoftBg: Record<Tone, string> = {
  accent: "bg-accent/10 ring-accent/20",
  violet: "bg-violet/10 ring-violet/20",
  success: "bg-success/10 ring-success/20",
  warning: "bg-warning/10 ring-warning/20",
  danger: "bg-danger/10 ring-danger/20",
  neutral: "bg-edge/10 ring-edge/15",
};

const toneDot: Record<Tone, string> = {
  accent: "bg-accent",
  violet: "bg-violet",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-edge",
};

/* Card --------------------------------------------------------------------- */

export function Card({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...props}
      className={clsx(
        "card-topline rounded-2xl border border-edge/10 bg-surface",
        className,
      )}
    >
      {children}
    </section>
  );
}

/* Buttons ------------------------------------------------------------------ */

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  onClick,
  disabled,
  busy,
  className,
  title,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      title={title}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold",
        "disabled:opacity-45 disabled:saturate-50 disabled:shadow-none",
        size === "sm" && "h-8 px-3.5 text-xs",
        size === "md" && "h-9 px-[18px] text-sm",
        size === "lg" && "h-11 px-6 text-sm",
        variant === "primary" && "btn-primary",
        variant === "secondary" &&
          "btn-press border border-edge/20 bg-surface-2 text-ink hover:border-edge/40 hover:bg-surface-3",
        variant === "ghost" && "btn-press text-muted hover:bg-edge/10 hover:text-ink",
        variant === "danger" &&
          "btn-press bg-danger/15 text-danger ring-1 ring-danger/30 hover:bg-danger/25",
        className,
      )}
    >
      {variant === "primary" && <span className="btn-shine" aria-hidden="true" />}
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        Icon && <Icon className="h-4 w-4" />
      )}
      {children}
    </button>
  );
}

/* Icon container ------------------------------------------------------------
   Two-layer "machined" tile: tinted core with an inner top light and a soft
   drop, so module icons read as physical hardware rather than flat chips. */

export function IconBox({
  icon: Icon,
  tone = "accent",
  size = "md",
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={clsx(
        "icon-bezel grid shrink-0 place-items-center rounded-xl ring-1",
        toneSoftBg[tone],
        size === "sm" && "h-8 w-8",
        size === "md" && "h-10 w-10",
        size === "lg" && "h-12 w-12 rounded-[14px]",
      )}
    >
      <Icon
        className={clsx(
          toneText[tone],
          size === "sm" ? "h-4 w-4" : size === "md" ? "h-5 w-5" : "h-6 w-6",
        )}
      />
    </span>
  );
}

/* Pills / badges ------------------------------------------------------------- */

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1",
        toneSoftBg[tone],
        toneText[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Status as a small dot + label — quieter than a filled pill in dense tables. */
export function StatusDot({
  tone,
  label,
  className,
}: {
  tone: Tone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 text-xs font-semibold",
        toneText[tone],
        className,
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", toneDot[tone])} />
      {label}
    </span>
  );
}

/* Toggle ---------------------------------------------------------------------- */

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  testId,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
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
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
        checked
          ? "bg-accent-strong shadow-[inset_0_1px_2px_rgba(0,0,0,0.2),0_0_12px_-2px_rgb(var(--c-accent)/0.5)]"
          : "bg-edge/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]",
        disabled && "opacity-40",
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm",
          "transition-[left,transform] duration-200 [transition-timing-function:var(--ease-spring)]",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

/* Checkbox ---------------------------------------------------------------------- */

export function Checkbox({
  checked,
  mixed = false,
  disabled = false,
  ariaLabel,
  onChange,
}: {
  checked: boolean;
  mixed?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
}) {
  const active = checked || mixed;
  return (
    <label
      className={clsx(
        "relative grid h-[18px] w-[18px] place-items-center",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="absolute inset-0 z-10 h-full w-full opacity-0"
        aria-label={ariaLabel}
      />
      <span
        aria-hidden="true"
        className={clsx(
          "pointer-events-none grid h-[18px] w-[18px] place-items-center rounded-[5px] border transition-all duration-150",
          active
            ? "border-accent-strong bg-accent-strong text-slate-950 shadow-[0_0_8px_-2px_rgb(var(--c-accent)/0.5)]"
            : "border-edge/30 bg-surface-2",
          disabled && "opacity-35",
        )}
      >
        {checked ? (
          <Check className="h-3 w-3 stroke-[3.5]" />
        ) : mixed ? (
          <span className="h-0.5 w-2 rounded-full bg-slate-950" />
        ) : null}
      </span>
    </label>
  );
}

/* Search ------------------------------------------------------------------------- */

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label
      className={clsx(
        "flex h-9 items-center gap-2 rounded-lg border border-edge/15 bg-surface-2 px-3",
        "transition-[border-color,box-shadow] duration-150",
        "focus-within:border-accent/50 focus-within:shadow-[0_0_0_3px_rgb(var(--c-accent)/0.12)]",
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-muted" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
      />
      {value && (
        <button
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </label>
  );
}

/* Filter chip ----------------------------------------------------------------------- */

export function FilterChip({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "btn-press inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold",
        active
          ? "bg-accent/15 text-accent ring-1 ring-accent/30 shadow-[0_0_14px_-4px_rgb(var(--c-accent)/0.4)]"
          : "text-muted hover:bg-edge/10 hover:text-ink",
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={clsx(
            "tabular-nums text-[10px]",
            active ? "text-accent/80" : "text-muted/70",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* Stat tile ---------------------------------------------------------------------------
   Numbers are the product: display-size tabular value, quiet label, and a
   tone-tinted icon bezel. */

export function StatTile({
  icon,
  label,
  value,
  sub,
  tone = "accent",
  delay = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  delay?: number;
}) {
  return (
    <Card
      className="animate-rise flex items-center gap-3.5 p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <IconBox icon={icon} tone={tone} size="md" />
      <div className="min-w-0">
        <div className="type-display truncate text-[22px] font-bold leading-7 tabular-nums text-ink">
          {value}
        </div>
        <div className="mt-0.5 truncate text-xs font-medium text-muted">
          {label}
          {sub && <span className="text-muted/60"> · {sub}</span>}
        </div>
      </div>
    </Card>
  );
}

/* Modal ------------------------------------------------------------------------------ */

export function Modal({
  title,
  subtitle,
  icon,
  tone = "accent",
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: Tone;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="animate-fade fixed inset-0 z-[70] grid place-items-center bg-black/55 px-6 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          "animate-pop card-topline w-full rounded-2xl border border-edge/15 bg-surface p-5 shadow-pop",
          wide ? "max-w-[640px]" : "max-w-[480px]",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {icon && <IconBox icon={icon} tone={tone} size="md" />}
            <div>
              <h2 className="type-display text-lg font-bold text-ink">{title}</h2>
              {subtitle && <p className="mt-1 text-sm leading-5 text-muted">{subtitle}</p>}
            </div>
          </div>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="btn-press grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-edge/10 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children && <div className="mt-4">{children}</div>}
        {footer && <div className="mt-5 flex justify-end gap-2.5">{footer}</div>}
      </div>
    </div>
  );
}

/* Empty state ---------------------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const Icon = icon;
  return (
    <div className="grid min-h-[280px] place-items-center px-6 py-12 text-center">
      <div className="animate-rise">
        <span className="icon-bezel mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 ring-1 ring-accent/20">
          <Icon className="h-7 w-7 text-accent" />
        </span>
        <h3 className="type-display mt-4 text-base font-bold text-ink">{title}</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-5 text-muted">{description}</p>
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

/* Progress ----------------------------------------------------------------------------- */

export function ProgressBar({
  value,
  indeterminate = false,
  className,
}: {
  value?: number;
  indeterminate?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "h-1.5 w-full overflow-hidden rounded-full bg-edge/15",
        indeterminate && "progress-indeterminate",
        className,
      )}
    >
      {!indeterminate && (
        <div
          className="bar-grow disk-bar h-full rounded-full"
          style={{ width: `${Math.min(Math.max(value ?? 0, 0), 100)}%` }}
        />
      )}
    </div>
  );
}

/* Inline notice ---------------------------------------------------------------------------- */

export function Notice({
  tone = "accent",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl px-3.5 py-2.5 text-[13px] font-medium leading-5 ring-1",
        toneSoftBg[tone],
        tone === "neutral" ? "text-muted" : toneText[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
