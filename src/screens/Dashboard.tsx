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
import type { MouseEvent as ReactMouseEvent } from "react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";
import { api, isTauri } from "../lib/ipc";
import { formatBytes, formatRelative } from "../lib/format";
import type { ActivityEntry, ScreenId } from "../lib/types";
import { Button, Card, IconBox, Pill } from "../components/ui";
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

/** Per-module CTA styling. Tinted fill, ring edge, brightens with the card. */
const CTA_CLASSES: Record<Tone, string> = {
  accent:
    "bg-accent/15 text-accent ring-1 ring-accent/25 group-hover:bg-accent/25 group-hover:ring-accent/40",
  violet:
    "bg-violet/15 text-violet ring-1 ring-violet/25 group-hover:bg-violet/25 group-hover:ring-violet/40",
  warning:
    "bg-warning/15 text-warning ring-1 ring-warning/25 group-hover:bg-warning/25 group-hover:ring-warning/40",
  neutral:
    "bg-edge/10 text-ink ring-1 ring-edge/20 group-hover:bg-edge/20 group-hover:ring-edge/35",
  success:
    "bg-success/15 text-success ring-1 ring-success/25 group-hover:bg-success/25 group-hover:ring-success/40",
  danger:
    "bg-danger/15 text-danger ring-1 ring-danger/25 group-hover:bg-danger/25 group-hover:ring-danger/40",
};

/** Arrow chip inside the CTA — its own circular wrapper so the action has a
    physical "go" affordance that nudges forward with the card hover. */
const CTA_CHIP_CLASSES: Record<Tone, string> = {
  accent: "bg-accent/15",
  violet: "bg-violet/15",
  warning: "bg-warning/15",
  neutral: "bg-edge/15",
  success: "bg-success/15",
  danger: "bg-danger/15",
};

const DASH = "—";

/** Animate a number from 0 to `target` over ~700ms. Instant under
    prefers-reduced-motion and outside the desktop shell (no data anyway). */
function useCountUp(target: number): number {
  const [display, setDisplay] = useState(0);
  const frame = useRef<number>();

  useEffect(() => {
    if (target <= 0) {
      setDisplay(target);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(target);
      return;
    }
    const started = performance.now();
    const duration = 700;
    const tick = (now: number) => {
      const t = Math.min((now - started) / duration, 1);
      // ease-out-quart — fast start, settles gently into the real number.
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(target * eased));
      if (t < 1) {
        frame.current = requestAnimationFrame(tick);
      }
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

    const tempScans = byKind("scan");
    const cleanups = byKind("cleanup");
    const startupEntries = byKind("startup");
    const diskEntries = byKind("disk");

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const lastWeekCount = history.filter((entry) => entry.timestampMs >= weekAgo).length;

    return {
      totalFreed,
      lastCleanup,
      lastScan,
      tempScans,
      cleanups,
      startupEntries,
      diskEntries,
      lastWeekCount,
    };
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
            delay={160 + index * 60}
            onOpen={() => onNavigate(module.id)}
          />
        ))}
      </section>

      <Card className="animate-rise p-5" style={{ animationDelay: "420ms" }}>
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
            {history.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 py-2.5">
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
   The signature surface: an aurora console. A slow teal/violet aurora drifts
   behind a faint engineering grid; the cursor casts a quiet spotlight. The
   left side carries the promise and the primary action; the right side is the
   shield orb. A live stats strip is built into the panel's base so the data
   reads as part of the instrument, not as separate widgets. */

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
  const panelRef = useRef<HTMLElement>(null);

  // Spotlight tracking writes style props directly — no React state, no
  // re-renders, runs only on devices with a fine pointer.
  const handleMouseMove = (event: ReactMouseEvent<HTMLElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    panel.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    panel.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  };

  const animatedFreed = useCountUp(totalFreed);

  return (
    <section
      ref={panelRef}
      onMouseMove={handleMouseMove}
      className="hero-panel animate-rise rounded-2xl border border-edge/10"
    >
      <div className="hero-aurora" aria-hidden="true" />
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-spotlight" aria-hidden="true" />

      <div className="flex items-center justify-between gap-8 px-7 pt-6">
        <div className="max-w-[620px] pb-2">
          <h2 className="type-display text-[30px] font-bold leading-[1.12] text-ink">
            Your PC, kept clean. <span className="text-accent">Transparently.</span>
          </h2>
          <p className="mt-2.5 max-w-[560px] text-sm leading-6 text-muted">
            CleanStart never deletes anything without showing you first. Cleanups go to the
            Recycle Bin, personal folders are off-limits, and every action is logged locally.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Button size="md" icon={Droplets} onClick={() => onNavigate("temp")}>
              Preview temp files
            </Button>
            <div className="flex items-center gap-2">
              <Pill tone="success">
                <ShieldCheck className="h-3 w-3" /> Preview-first
              </Pill>
              <Pill tone="accent">
                <Recycle className="h-3 w-3" /> Recycle Bin only
              </Pill>
            </div>
          </div>
        </div>

        <HeroOrb />
      </div>

      {/* Live stats strip — part of the instrument's base. */}
      <div className="mt-4 grid grid-cols-3 divide-x divide-edge/10 border-t border-edge/10">
        <HeroMetric
          icon={Sparkles}
          tone="accent"
          value={totalFreed > 0 ? formatBytes(animatedFreed) : DASH}
          label="Space reclaimed with CleanStart"
          sub={totalFreed > 0 ? "all time" : "no cleanups yet"}
        />
        <HeroMetric
          icon={History}
          tone="success"
          value={lastCleanup ? formatRelative(lastCleanup.timestampMs) : DASH}
          label="Last cleanup"
          sub={
            lastCleanup?.bytesFreed ? `${formatBytes(lastCleanup.bytesFreed)} freed` : undefined
          }
        />
        <HeroMetric
          icon={CalendarClock}
          tone="neutral"
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
  tone,
  value,
  label,
  sub,
}: {
  icon: LucideIcon;
  tone: Tone;
  value: string;
  label: string;
  sub?: string;
}) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-3.5 px-6 py-4">
      <IconBox icon={Icon} tone={tone} size="md" />
      <div className="min-w-0">
        <div className="type-display truncate text-[20px] font-bold leading-6 tabular-nums text-ink">
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

/* The shield orb: layered glows, a slow conic ring, a counter-rotating dashed
   ring, and three orbiting marker dots riding the outer ring. Decorative,
   aria-hidden, fully stilled under reduced motion. */

function HeroOrb() {
  return (
    <div
      className="relative hidden h-[188px] w-[240px] shrink-0 lg:block"
      aria-hidden="true"
    >
      {/* Ambient glow blobs */}
      <div className="absolute right-8 top-1/2 h-[200px] w-[200px] -translate-y-1/2 rounded-full bg-accent/[0.14] blur-3xl" />
      <div className="absolute right-0 top-2 h-[110px] w-[110px] rounded-full bg-violet/[0.13] blur-2xl" />

      <div className="orb-float absolute right-10 top-1/2 h-[156px] w-[156px] -translate-y-1/2">
        {/* Slow conic ring with orbiting marker dots */}
        <div className="orb-ring absolute inset-0">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgb(var(--c-accent) / 0.5) 70deg, transparent 160deg, rgb(var(--c-violet) / 0.35) 250deg, transparent 330deg)",
            }}
          />
          <span className="absolute left-1/2 top-[-2px] h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-accent shadow-[0_0_8px_rgb(var(--c-accent)/0.8)]" />
          <span className="absolute bottom-[18px] right-[8px] h-[4px] w-[4px] rounded-full bg-violet shadow-[0_0_6px_rgb(var(--c-violet)/0.8)]" />
          <span className="absolute bottom-[30px] left-[4px] h-[3px] w-[3px] rounded-full bg-accent/80" />
        </div>

        {/* Counter-rotating dashed ring */}
        <svg viewBox="0 0 156 156" className="orb-ring-reverse absolute inset-[-10px] h-[176px] w-[176px]">
          <circle
            cx="78"
            cy="78"
            r="74"
            fill="none"
            stroke="rgb(var(--c-edge) / 0.18)"
            strokeWidth="1"
            strokeDasharray="2 9"
          />
        </svg>

        {/* Inner disc */}
        <div className="absolute inset-[6px] rounded-full bg-surface shadow-[inset_0_1px_0_rgb(255_255_255/0.07)] ring-1 ring-edge/15" />
        <div
          className="absolute inset-[6px] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 32% 26%, rgb(var(--c-accent) / 0.16), transparent 58%)",
          }}
        />

        {/* Shield */}
        <svg viewBox="0 0 40 40" className="absolute inset-0 m-auto h-[74px] w-[74px]">
          <defs>
            <linearGradient id="cs-hero-shield" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgb(var(--c-accent))" />
              <stop offset="100%" stopColor="rgb(var(--c-accent-strong))" />
            </linearGradient>
          </defs>
          <path
            d="M20 3 L34 8.5 V19 C34 28 28 34.5 20 37 C12 34.5 6 28 6 19 V8.5 Z"
            fill="url(#cs-hero-shield)"
            opacity="0.16"
          />
          <path
            d="M20 3 L34 8.5 V19 C34 28 28 34.5 20 37 C12 34.5 6 28 6 19 V8.5 Z"
            fill="none"
            stroke="url(#cs-hero-shield)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M13.5 19.5 L18 24 L27 14.5"
            fill="none"
            stroke="rgb(var(--c-accent))"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

/* Module cards ----------------------------------------------------------------
   Information + action: a bezeled icon carrying the module identity, two live
   stats over a hairline, and a CTA whose arrow rides in its own chip. The
   card lifts on a spring, casts a shadow in its own accent, and a single
   light sweep crosses it — all interruptible. */

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
    <Card
      className="module-card animate-rise group flex cursor-pointer flex-col p-4"
      data-tone={module.tone}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onOpen}
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
      <span className="card-shimmer" aria-hidden="true" />

      <IconBox icon={Icon} tone={module.tone} size="lg" />

      <h3 className="type-display mt-3.5 text-[15px] font-bold text-ink">{module.title}</h3>
      <p className="mt-1 min-h-[36px] text-xs leading-[18px] text-muted">
        {module.description}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-edge/10 pt-3">
        {module.stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <div className="type-display truncate text-[15px] font-bold tabular-nums text-ink">
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
          "mt-4 inline-flex h-9 w-full items-center justify-between rounded-lg pl-3.5 pr-1.5 text-[13px] font-semibold transition-all duration-150",
          CTA_CLASSES[module.tone],
        )}
      >
        {module.action}
        <span
          className={clsx(
            "grid h-6 w-6 place-items-center rounded-full transition-transform duration-200 [transition-timing-function:var(--ease-spring)] group-hover:translate-x-0.5",
            CTA_CHIP_CLASSES[module.tone],
          )}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </span>
    </Card>
  );
}
