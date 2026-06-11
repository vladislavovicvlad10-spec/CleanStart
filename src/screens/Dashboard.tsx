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
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";
import { api, isTauri } from "../lib/ipc";
import { formatBytes, formatRelative } from "../lib/format";
import type { ActivityEntry, ScreenId } from "../lib/types";
import { Card, IconBox, Pill } from "../components/ui";
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

const DASH = "—";

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
      <Hero />

      <section className="grid grid-cols-3 gap-4">
        <HeroStat
          icon={Sparkles}
          tone="accent"
          value={stats.totalFreed > 0 ? formatBytes(stats.totalFreed) : DASH}
          label="Space reclaimed with CleanStart"
          sub={stats.totalFreed > 0 ? "all time" : "no cleanups yet"}
          delay={60}
        />
        <HeroStat
          icon={History}
          tone="success"
          value={stats.lastCleanup ? formatRelative(stats.lastCleanup.timestampMs) : DASH}
          label="Last cleanup"
          sub={
            stats.lastCleanup?.bytesFreed
              ? `${formatBytes(stats.lastCleanup.bytesFreed)} freed`
              : undefined
          }
          delay={110}
        />
        <HeroStat
          icon={CalendarClock}
          tone="neutral"
          value={stats.lastScan ? formatRelative(stats.lastScan.timestampMs) : DASH}
          label="Last scan"
          sub={stats.lastScan ? stats.lastScan.title : "run a scan to get started"}
          delay={160}
        />
      </section>

      <section className="grid grid-cols-4 gap-4">
        {modules.map((module, index) => (
          <ModuleCard
            key={module.id}
            module={module}
            delay={200 + index * 50}
            onOpen={() => onNavigate(module.id)}
          />
        ))}
      </section>

      <Card className="animate-rise p-5" style={{ animationDelay: "420ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-bold tracking-tight text-ink">Recent activity</h3>
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
   Headline left, glowing shield orb right. The orb is purely decorative:
   layered radial glows, a slow conic ring, and the CleanStart shield. */

function Hero() {
  return (
    <section className="animate-rise relative flex items-center justify-between gap-8 overflow-hidden rounded-2xl py-2 pr-2">
      <div className="max-w-[600px] py-3">
        <h2 className="text-[28px] font-bold leading-[1.15] tracking-tight text-ink">
          Your PC, kept clean.{" "}
          <span className="bg-gradient-to-r from-accent to-violet bg-clip-text text-transparent">
            Transparently.
          </span>
        </h2>
        <p className="mt-2.5 max-w-[600px] text-sm leading-6 text-muted">
          CleanStart never deletes anything without showing you first. Cleanups go to the
          Recycle Bin, personal folders are off-limits, and every action is logged locally.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Pill tone="success">
            <ShieldCheck className="h-3 w-3" /> Preview-first
          </Pill>
          <Pill tone="accent">
            <Recycle className="h-3 w-3" /> Recycle Bin only
          </Pill>
        </div>
      </div>

      <HeroOrb />
    </section>
  );
}

function HeroOrb() {
  return (
    <div
      className="relative hidden h-[176px] w-[230px] shrink-0 lg:block"
      aria-hidden="true"
    >
      {/* Ambient glow blobs */}
      <div className="absolute right-8 top-1/2 h-[190px] w-[190px] -translate-y-1/2 rounded-full bg-accent/[0.13] blur-3xl" />
      <div className="absolute right-0 top-2 h-[110px] w-[110px] rounded-full bg-violet/[0.12] blur-2xl" />

      <div className="orb-float absolute right-10 top-1/2 h-[150px] w-[150px] -translate-y-1/2">
        {/* Slow conic ring */}
        <div
          className="orb-ring absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgb(var(--c-accent) / 0.45) 70deg, transparent 160deg, rgb(var(--c-violet) / 0.3) 250deg, transparent 330deg)",
          }}
        />
        {/* Inner disc */}
        <div className="absolute inset-[5px] rounded-full bg-surface ring-1 ring-edge/15" />
        <div
          className="absolute inset-[5px] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 32% 26%, rgb(var(--c-accent) / 0.14), transparent 58%)",
          }}
        />
        {/* Shield */}
        <svg viewBox="0 0 40 40" className="absolute inset-0 m-auto h-[72px] w-[72px]">
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

/* Stat tiles ----------------------------------------------------------------- */

function HeroStat({
  icon,
  tone,
  value,
  label,
  sub,
  delay,
}: {
  icon: LucideIcon;
  tone: Tone;
  value: string;
  label: string;
  sub?: string;
  delay: number;
}) {
  const Icon = icon;
  return (
    <Card
      className="animate-rise flex items-center gap-3.5 p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <IconBox icon={Icon} tone={tone} size="md" />
      <div className="min-w-0">
        <div className="truncate text-xl font-bold tracking-tight text-ink">{value}</div>
        <div className="mt-0.5 truncate text-xs font-medium text-muted">
          {label}
          {sub && <span className="text-muted/60"> · {sub}</span>}
        </div>
      </div>
    </Card>
  );
}

/* Module cards ----------------------------------------------------------------
   Information + action: icon with module identity, two live stats, and a
   CTA in the module's own accent. The whole card is clickable. */

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
      <IconBox icon={Icon} tone={module.tone} size="lg" />

      <h3 className="mt-3.5 text-[15px] font-bold tracking-tight text-ink">{module.title}</h3>
      <p className="mt-1 min-h-[36px] text-xs leading-[18px] text-muted">
        {module.description}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-edge/10 pt-3">
        {module.stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <div className="truncate text-[15px] font-bold tabular-nums tracking-tight text-ink">
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
          "mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150",
          CTA_CLASSES[module.tone],
        )}
      >
        {module.action}
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Card>
  );
}
