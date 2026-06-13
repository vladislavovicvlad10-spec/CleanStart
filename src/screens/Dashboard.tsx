import {
  Activity,
  ArrowUpRight,
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
import {
  onParallaxLeave,
  onParallaxMove,
  onTiltEnter,
  onTiltLeave,
  onTiltMove,
  prefersReducedMotion,
} from "../lib/motion";
import type { ActivityEntry, ScreenId } from "../lib/types";
import { Card, Pill } from "../components/ui";
import type { Tone } from "../components/ui";

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
   A frosted instrument panel floating over the mesh. Background layers
   parallax against the cursor at different rates; the headline reveals with a
   variable-weight animation (thin -> bold). Right side is the radar. The
   readout strip is fused into the panel base so live numbers read as the
   instrument's display. */

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
    <section
      className="hero-panel animate-rise rounded-[20px] border border-edge/10"
      onMouseMove={onParallaxMove}
      onMouseLeave={onParallaxLeave}
    >
      <div className="hero-layer l-back" aria-hidden="true" />
      <div className="hero-layer l-grid" aria-hidden="true" />

      <div className="flex items-center justify-between gap-8 px-8 pt-7">
        <div className="max-w-[600px] pb-3">
          <h2 className="hero-title type-display text-[34px] leading-[1.08] text-ink">
            Your PC, kept clean.
            <br />
            <span className="text-accent">Transparently.</span>
          </h2>
          <p className="mt-3 max-w-[540px] text-sm leading-6 text-muted">
            CleanStart never deletes anything without showing you first. Cleanups go to the
            Recycle Bin, personal folders are off-limits, and every action is logged locally.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => onNavigate("temp")}
              className="btn-primary inline-flex h-9 items-center justify-center gap-2 rounded-full px-[18px] text-sm font-semibold"
            >
              <span className="btn-shine" aria-hidden="true" />
              <Droplets className="h-4 w-4" />
              Preview temp files
            </button>
            <div className="flex items-center gap-2">
              <Pill tone="neutral">
                <ShieldCheck className="h-3 w-3 text-success" /> Preview-first
              </Pill>
              <Pill tone="neutral">
                <Recycle className="h-3 w-3 text-accent" /> Recycle Bin only
              </Pill>
            </div>
          </div>
        </div>

        <Radar />
      </div>

      <div className="mt-5 grid grid-cols-3 divide-x divide-edge/10 border-t border-edge/10">
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
          highlight ? "bg-accent/10 ring-accent/25" : "bg-edge/[0.07] ring-edge/15",
        )}
      >
        <Icon className={clsx("h-5 w-5", highlight ? "text-accent" : "text-muted")} />
      </span>
      <div className="min-w-0">
        <div
          className={clsx(
            "stat-number truncate text-[21px] font-bold leading-6 text-ink",
            highlight && "[text-shadow:0_0_18px_rgb(var(--c-accent)/0.4)]",
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

/* The radar: hairline rings, crosshair, slow cyan sweep, and blips that
   brighten as the beam passes. Decorative, aria-hidden, stilled on reduce. */

function Radar() {
  return (
    <div className="relative hidden h-[210px] w-[250px] shrink-0 lg:block" aria-hidden="true">
      <div className="absolute right-4 top-1/2 h-[210px] w-[210px] -translate-y-1/2 rounded-full bg-accent/[0.08] blur-3xl" />

      <div className="absolute right-6 top-1/2 h-[196px] w-[196px] -translate-y-1/2 overflow-hidden rounded-full">
        <div className="radar-sweep" />

        <svg viewBox="0 0 196 196" className="absolute inset-0 h-full w-full">
          <circle cx="98" cy="98" r="96" fill="none" stroke="rgb(var(--c-edge) / 0.16)" strokeWidth="1" />
          <circle cx="98" cy="98" r="68" fill="none" stroke="rgb(var(--c-edge) / 0.13)" strokeWidth="1" />
          <circle cx="98" cy="98" r="40" fill="none" stroke="rgb(var(--c-edge) / 0.11)" strokeWidth="1" />
          <line x1="98" y1="2" x2="98" y2="194" stroke="rgb(var(--c-edge) / 0.08)" strokeWidth="1" />
          <line x1="2" y1="98" x2="194" y2="98" stroke="rgb(var(--c-edge) / 0.08)" strokeWidth="1" />
        </svg>

        <span
          className="radar-blip absolute left-[128px] top-[44px] h-[5px] w-[5px] rounded-full bg-accent shadow-[0_0_10px_rgb(var(--c-accent)/0.9)]"
          style={{ animationDelay: "-5.0s" }}
        />
        <span
          className="radar-blip absolute left-[52px] top-[124px] h-[4px] w-[4px] rounded-full bg-accent shadow-[0_0_8px_rgb(var(--c-accent)/0.8)]"
          style={{ animationDelay: "-2.4s" }}
        />
        <span
          className="radar-blip absolute left-[140px] top-[140px] h-[3px] w-[3px] rounded-full bg-accent/90 shadow-[0_0_6px_rgb(var(--c-accent)/0.7)]"
          style={{ animationDelay: "-0.6s" }}
        />

        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_12px_rgb(var(--c-accent)/0.9)]" />
      </div>

      <div className="absolute bottom-2 right-10 flex items-center gap-1.5 rounded-full border border-edge/15 bg-surface/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        System protected
      </div>
    </div>
  );
}

/* Module cards ----------------------------------------------------------------
   Glassy instruments that tilt toward the cursor in true 3D. The gradient
   icon tile, title and CTA float on Z so depth separates under tilt. The
   hairline border lights up around the cursor, a shimmer crosses once on
   hover, and the drop shadow takes the module's color. */

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
        className="tilt-card group flex cursor-pointer flex-col rounded-[20px] border border-edge/10 p-4"
        data-tone={module.tone}
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
        <span className="card-shimmer" aria-hidden="true" />

        <span
          className="grad-tile tilt-z relative z-[1] grid h-12 w-12 place-items-center rounded-[14px]"
          data-tone={module.tone}
        >
          <Icon className="h-6 w-6" />
        </span>

        <h3 className="tilt-z-sm relative z-[1] mt-3.5 text-[15px] font-bold text-ink type-display">
          {module.title}
        </h3>
        <p className="relative z-[1] mt-1 min-h-[36px] text-xs leading-[18px] text-muted">
          {module.description}
        </p>

        <div className="relative z-[1] mt-3 grid grid-cols-2 gap-3 border-t border-edge/10 pt-3">
          {module.stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <div className="stat-number truncate text-[15px] font-bold text-ink">
                {stat.value}
              </div>
              <div className="mt-0.5 truncate text-[11px] font-medium text-muted">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <span className="tilt-z-sm relative z-[1] mt-4 inline-flex h-9 w-full items-center justify-between rounded-xl bg-edge/[0.07] pl-4 pr-1.5 text-[13px] font-semibold text-ink ring-1 ring-edge/15 transition-colors duration-200 group-hover:bg-edge/10 group-hover:ring-edge/25">
          {module.action}
          <span className="grid h-6 w-6 place-items-center rounded-full bg-edge/15 text-ink transition-all duration-200 [transition-timing-function:var(--ease-spring)] group-hover:translate-x-0.5 group-hover:bg-accent group-hover:text-black">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </span>
      </div>
    </div>
  );
}
