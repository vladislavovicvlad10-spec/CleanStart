import {
  Activity,
  ArrowRight,
  CalendarClock,
  Droplets,
  HardDrive,
  History,
  Recycle,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";
import { api, isTauri } from "../lib/ipc";
import { formatBytes, formatRelative } from "../lib/format";
import { onTiltEnter, onTiltLeave, onTiltMove, prefersReducedMotion } from "../lib/motion";
import type { ActivityEntry, ScreenId } from "../lib/types";
import { Card, Pill } from "../components/ui";
import type { Tone } from "../components/ui";
import { HeroOrb } from "../components/HeroOrb";

interface ModuleStat {
  value: string;
  label: string;
}

interface ModuleCardData {
  id: ScreenId;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: Tone;
  action: string;
  stats: [ModuleStat, ModuleStat];
}

const STATUS_TONE: Record<ActivityEntry["status"], Tone> = {
  info: "accent",
  success: "success",
  warning: "warning",
  error: "danger",
};

/** Bottom CTA fill on card hover — fixed, contrast-safe module colors so
    white text always reads, independent of theme token shifts. */
const CTA_FILL: Record<Tone, string> = {
  accent: "group-hover:bg-[#0f766e] group-hover:text-white group-hover:ring-[#0f766e]",
  violet: "group-hover:bg-[#6d28d9] group-hover:text-white group-hover:ring-[#6d28d9]",
  warning: "group-hover:bg-[#b45309] group-hover:text-white group-hover:ring-[#b45309]",
  neutral: "group-hover:bg-[#334155] group-hover:text-white group-hover:ring-[#334155]",
  success: "group-hover:bg-[#047857] group-hover:text-white group-hover:ring-[#047857]",
  danger: "group-hover:bg-[#b91c1c] group-hover:text-white group-hover:ring-[#b91c1c]",
};

const DASH = "—";

/** Count a number from 0 to `target` (~750ms, ease-out-quart). Instant under
    reduced motion. Used for the hero's reclaimed-space metric. */
function useCountUp(target: number): number {
  const [display, setDisplay] = useState(0);
  const frame = useRef<number>();

  useEffect(() => {
    if (target <= 0 || prefersReducedMotion()) {
      setDisplay(target);
      return;
    }
    const started = performance.now();
    const duration = 750;
    const tick = (now: number) => {
      const t = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(target * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target]);

  return display;
}

export function DashboardScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [history, setHistory] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    if (!isTauri()) return;
    api
      .getActivityLog()
      .then(setHistory)
      .catch(() => undefined);
  }, []);

  const stats = useMemo(() => {
    const totalFreed = history.reduce(
      (total, entry) => total + (entry.kind === "cleanup" ? (entry.bytesFreed ?? 0) : 0),
      0,
    );
    const lastCleanup = history.find(
      (entry) => entry.kind === "cleanup" && (entry.bytesFreed ?? 0) > 0,
    );
    const lastScan = history.find(
      (entry) => entry.kind === "scan" || entry.kind === "disk" || entry.kind === "startup",
    );

    const byKind = (kind: ActivityEntry["kind"]) =>
      history.filter((entry) => entry.kind === kind);

    const startupEntries = byKind("startup");
    const diskEntries = byKind("disk");
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const lastWeekCount = history.filter((entry) => entry.timestampMs >= weekAgo).length;

    return { totalFreed, lastCleanup, lastScan, startupEntries, diskEntries, lastWeekCount };
  }, [history]);

  const modules: ModuleCardData[] = [
    {
      id: "temp",
      title: "Temp Cleaner",
      description: "Preview safe temp files, then send them to the Recycle Bin.",
      icon: Droplets,
      tone: "accent",
      action: "Preview temp files",
      stats: [
        {
          value: stats.totalFreed > 0 ? formatBytes(stats.totalFreed) : DASH,
          label: "reclaimed all-time",
        },
        {
          value: stats.lastCleanup ? formatRelative(stats.lastCleanup.timestampMs) : DASH,
          label: "last cleanup",
        },
      ],
    },
    {
      id: "startup",
      title: "Startup Analyzer",
      description: "Review what launches with Windows. Disable reversibly.",
      icon: Rocket,
      tone: "violet",
      action: "Review startup",
      stats: [
        {
          value:
            stats.startupEntries.length > 0 ? String(stats.startupEntries.length) : DASH,
          label: "reviews logged",
        },
        {
          value: stats.startupEntries[0]
            ? formatRelative(stats.startupEntries[0].timestampMs)
            : DASH,
          label: "last review",
        },
      ],
    },
    {
      id: "disk",
      title: "Disk Analyzer",
      description: "See which profile folders use the most space. Read-only.",
      icon: HardDrive,
      tone: "warning",
      action: "Analyze disk usage",
      stats: [
        {
          value: stats.diskEntries.length > 0 ? String(stats.diskEntries.length) : DASH,
          label: "scans logged",
        },
        {
          value: stats.diskEntries[0]
            ? formatRelative(stats.diskEntries[0].timestampMs)
            : DASH,
          label: "last scan",
        },
      ],
    },
    {
      id: "activity",
      title: "Activity Log",
      description: "Every scan and cleanup, logged on this PC only.",
      icon: Activity,
      tone: "neutral",
      action: "Open history",
      stats: [
        {
          value: history.length > 0 ? history.length.toLocaleString() : DASH,
          label: "entries total",
        },
        {
          value: stats.lastWeekCount > 0 ? String(stats.lastWeekCount) : DASH,
          label: "past 7 days",
        },
      ],
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5">
      <Hero
        totalFreed={stats.totalFreed}
        lastCleanup={stats.lastCleanup}
        lastScan={stats.lastScan}
        onNavigate={onNavigate}
      />

      <section className="grid grid-cols-4 gap-4">
        {modules.map((module, index) => (
          <ModuleCard
            key={module.id}
            module={module}
            delay={200 + index * 80}
            onOpen={() => onNavigate(module.id)}
          />
        ))}
      </section>

      <Card className="animate-rise p-5" style={{ animationDelay: "540ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="type-display text-[15px] font-bold text-ink">Recent activity</h3>
          {history.length > 0 && (
            <button
              onClick={() => onNavigate("activity")}
              className="text-[13px] font-semibold text-accent transition-colors hover:text-accent-strong"
            >
              View all
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No activity yet. Start with a temp file preview. It changes nothing on disk.
          </p>
        ) : (
          <div className="divide-y divide-edge/10">
            {history.slice(0, 5).map((entry, index) => (
              <div
                key={entry.id}
                className="row-stagger flex items-center gap-3 py-2.5"
                style={{ ["--i" as string]: index }}
              >
                <span
                  className={clsx(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    entry.status === "success"
                      ? "bg-success"
                      : entry.status === "warning"
                        ? "bg-warning"
                        : entry.status === "error"
                          ? "bg-danger"
                          : "bg-accent",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink">{entry.title}</div>
                  <div className="truncate text-xs text-muted">{entry.detail}</div>
                </div>
                <Pill tone={STATUS_TONE[entry.status]} className="hidden md:inline-flex">
                  {entry.kind}
                </Pill>
                <span className="shrink-0 text-xs font-medium text-muted">
                  {formatRelative(entry.timestampMs)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* Hero ----------------------------------------------------------------------
   Clean typographic panel. No decorative orb: a single localized teal glow
   sits behind the headline, a faint hairline grid fades out toward the right.
   The headline reveals with a variable-weight animation (light -> 800). The
   readout strip fused into the base shows the live numbers. */

function Hero({
  totalFreed,
  lastCleanup,
  lastScan,
  onNavigate,
}: {
  totalFreed: number;
  lastCleanup?: ActivityEntry;
  lastScan?: ActivityEntry;
  onNavigate: (screen: ScreenId) => void;
}) {
  const animatedFreed = useCountUp(totalFreed);

  return (
    <section className="hero-panel animate-rise rounded-[20px]">
      <div className="hero-glow-layer" aria-hidden="true" />
      <div className="hero-grid" aria-hidden="true" />

      <div className="flex items-center justify-between gap-6 px-8 pt-8">
        <div className="max-w-[600px]">
          <h2 className="hero-title type-display text-[34px] font-extrabold leading-[1.06] text-ink">
            Your PC, kept clean.
            <br />
            <span className="hero-accent-word">Transparently.</span>
          </h2>
          <p className="mt-3 max-w-[460px] text-sm leading-6 text-muted">
            Nothing is deleted without your say-so. Every cleanup goes to the Recycle Bin, and
            personal folders are always off-limits.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => onNavigate("temp")}
              className="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-bold"
            >
              <span className="btn-shine" aria-hidden="true" />
              <Droplets className="h-[18px] w-[18px]" />
              Preview temp files
            </button>
            <div className="flex items-center gap-2">
              <Pill tone="success">
                <ShieldCheck className="h-3.5 w-3.5" /> Preview-first
              </Pill>
              <Pill tone="accent">
                <Recycle className="h-3.5 w-3.5" /> Recycle Bin only
              </Pill>
            </div>
          </div>
        </div>

        <HeroOrb />
      </div>

      <div className="mt-7 grid grid-cols-3 divide-x divide-edge/10 border-t border-edge/10">
        <HeroMetric
          icon={Sparkles}
          value={totalFreed > 0 ? formatBytes(animatedFreed) : DASH}
          label="Space reclaimed with CleanStart"
          sub={totalFreed > 0 ? "all time" : "no cleanups yet"}
          highlight
        />
        <HeroMetric
          icon={History}
          value={lastCleanup ? formatRelative(lastCleanup.timestampMs) : DASH}
          label="Last cleanup"
          sub={
            lastCleanup?.bytesFreed ? `${formatBytes(lastCleanup.bytesFreed)} freed` : undefined
          }
        />
        <HeroMetric
          icon={CalendarClock}
          value={lastScan ? formatRelative(lastScan.timestampMs) : DASH}
          label="Last scan"
          sub={lastScan ? lastScan.title : "run a scan to get started"}
        />
      </div>
    </section>
  );
}

function HeroMetric({
  icon,
  value,
  label,
  sub,
  highlight = false,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  sub?: string;
  highlight?: boolean;
}) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-3.5 px-7 py-4">
      <span
        className={clsx(
          "icon-bezel grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1",
          highlight ? "bg-accent/10 ring-accent/25" : "bg-edge/[0.06] ring-edge/15",
        )}
      >
        <Icon className={clsx("h-5 w-5", highlight ? "text-accent" : "text-muted")} />
      </span>
      <div className="min-w-0">
        <div
          className={clsx(
            "stat-number truncate text-[21px] font-bold leading-6 text-ink",
            highlight && "[text-shadow:0_0_16px_rgb(var(--c-accent)/0.3)]",
          )}
        >
          {value}
        </div>
        <div className="mt-0.5 truncate text-xs font-medium text-muted">
          {label}
          {sub && <span className="text-muted/60"> · {sub}</span>}
        </div>
      </div>
    </div>
  );
}

/* Module cards ----------------------------------------------------------------
   Solid surface that tilts gently toward the cursor. A 52px gradient icon
   tile, bold mono stats over a hairline, and a bottom CTA that fills with the
   module's color on hover while its arrow nudges right. */

function ModuleCard({
  module,
  delay,
  onOpen,
}: {
  module: ModuleCardData;
  delay: number;
  onOpen: () => void;
}) {
  const Icon = module.icon;
  return (
    <div className="animate-rise" style={{ animationDelay: `${delay}ms`, perspective: "1000px" }}>
      <div
        className="tilt-card group flex cursor-pointer flex-col rounded-[20px] p-4"
        onClick={onOpen}
        onMouseEnter={onTiltEnter}
        onMouseMove={onTiltMove}
        onMouseLeave={onTiltLeave}
        role="button"
        tabIndex={0}
        aria-label={`${module.title}: ${module.action}`}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
      >
        <span className="card-glow" aria-hidden="true" />

        <span
          className="grad-tile tilt-z relative z-[1] grid h-[52px] w-[52px] place-items-center rounded-2xl"
          data-tone={module.tone}
        >
          <Icon className="h-6 w-6" />
        </span>

        <h3 className="tilt-z-sm relative z-[1] mt-4 text-[15px] font-bold text-ink type-display">
          {module.title}
        </h3>
        <p className="relative z-[1] mt-1 min-h-[36px] text-xs leading-[18px] text-muted">
          {module.description}
        </p>

        <div className="relative z-[1] mt-3 grid grid-cols-2 gap-3 border-t border-edge/10 pt-3">
          {module.stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <div className="stat-number truncate text-[18px] font-bold leading-6 text-ink">
                {stat.value}
              </div>
              <div className="mt-0.5 truncate text-[11px] font-medium text-muted">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <span
          className={clsx(
            "tilt-z-sm relative z-[1] mt-4 inline-flex h-9 w-full items-center justify-between rounded-xl bg-edge/[0.07] pl-4 pr-1.5 text-[13px] font-semibold text-ink ring-1 ring-edge/15 transition-colors duration-200",
            CTA_FILL[module.tone],
          )}
        >
          {module.action}
          <span className="grid h-6 w-6 place-items-center rounded-full bg-edge/15 text-current transition-transform duration-200 [transition-timing-function:var(--ease-spring)] group-hover:translate-x-0.5 group-hover:bg-white/20">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </span>
      </div>
    </div>
  );
}
