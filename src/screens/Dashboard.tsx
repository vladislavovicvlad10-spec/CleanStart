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
import { api, isTauri } from "../lib/ipc";
import { formatBytes, formatRelative } from "../lib/format";
import type { ActivityEntry, ScreenId } from "../lib/types";
import { Card, IconBox, Pill, StatTile } from "../components/ui";
import type { Tone } from "../components/ui";

interface ModuleCard {
  id: ScreenId;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: Tone;
  action: string;
}

const MODULES: ModuleCard[] = [
  {
    id: "temp",
    title: "Temp Cleaner",
    description: "Preview safe temporary files, then move them to the Recycle Bin.",
    icon: Droplets,
    tone: "accent",
    action: "Preview temp files",
  },
  {
    id: "startup",
    title: "Startup Analyzer",
    description: "Review what launches with Windows. Disable reversibly — never delete.",
    icon: Rocket,
    tone: "success",
    action: "Review startup",
  },
  {
    id: "disk",
    title: "Disk Analyzer",
    description: "See which profile folders use the most space. Strictly read-only.",
    icon: HardDrive,
    tone: "warning",
    action: "Analyze disk usage",
  },
  {
    id: "activity",
    title: "Activity Log",
    description: "A local history of every scan and cleanup. Nothing leaves this PC.",
    icon: Activity,
    tone: "neutral",
    action: "Open history",
  },
];

const STATUS_TONE: Record<ActivityEntry["status"], Tone> = {
  info: "accent",
  success: "success",
  warning: "warning",
  error: "danger",
};

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
    return { totalFreed, lastCleanup, lastScan };
  }, [history]);

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5">
      <section className="animate-rise flex items-end justify-between gap-6 pt-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Your PC, kept clean — transparently.
          </h2>
          <p className="mt-1.5 max-w-[560px] text-sm leading-6 text-muted">
            CleanStart never deletes anything without showing you first. Cleanups go to the
            Recycle Bin, personal folders are off-limits, and every action is logged locally.
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Pill tone="success">
            <ShieldCheck className="h-3 w-3" /> Preview-first
          </Pill>
          <Pill tone="accent">
            <Recycle className="h-3 w-3" /> Recycle Bin only
          </Pill>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4">
        <StatTile
          icon={Sparkles}
          tone="accent"
          label="Space reclaimed with CleanStart"
          value={stats.totalFreed > 0 ? formatBytes(stats.totalFreed) : "—"}
          sub={stats.totalFreed > 0 ? "all time" : "no cleanups yet"}
          delay={0}
        />
        <StatTile
          icon={History}
          tone="success"
          label="Last cleanup"
          value={stats.lastCleanup ? formatRelative(stats.lastCleanup.timestampMs) : "—"}
          sub={
            stats.lastCleanup?.bytesFreed
              ? `${formatBytes(stats.lastCleanup.bytesFreed)} freed`
              : undefined
          }
          delay={50}
        />
        <StatTile
          icon={CalendarClock}
          tone="neutral"
          label="Last scan"
          value={stats.lastScan ? formatRelative(stats.lastScan.timestampMs) : "—"}
          sub={stats.lastScan ? stats.lastScan.title : "run a scan to get started"}
          delay={100}
        />
      </section>

      <section className="grid grid-cols-2 gap-4">
        {MODULES.map((module, index) => {
          const Icon = module.icon;
          return (
            <Card
              key={module.id}
              className="animate-rise group cursor-pointer p-5 transition-all duration-200 hover:border-accent/30 hover:shadow-glow"
              style={{ animationDelay: `${120 + index * 50}ms` }}
              onClick={() => onNavigate(module.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onNavigate(module.id);
              }}
            >
              <div className="flex items-start gap-4">
                <IconBox icon={Icon} tone={module.tone} size="lg" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-bold text-ink">{module.title}</h3>
                  <p className="mt-1 text-[13px] leading-5 text-muted">{module.description}</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent">
                    {module.action}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <Card className="animate-rise p-5" style={{ animationDelay: "320ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-ink">Recent activity</h3>
          {history.length > 0 && (
            <button
              onClick={() => onNavigate("activity")}
              className="text-[13px] font-semibold text-accent hover:text-accent-strong"
            >
              View all
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No activity yet. Start with a temp file preview — it changes nothing on disk.
          </p>
        ) : (
          <div className="divide-y divide-edge/10">
            {history.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 py-2.5">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    entry.status === "success"
                      ? "bg-success"
                      : entry.status === "warning"
                        ? "bg-warning"
                        : entry.status === "error"
                          ? "bg-danger"
                          : "bg-accent"
                  }`}
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
