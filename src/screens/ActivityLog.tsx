import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Info,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { api, friendlyError, isTauri } from "../lib/ipc";
import { dayLabel, formatBytes, formatClock } from "../lib/format";
import type { ActivityEntry, ActivityKind } from "../lib/types";
import {
  Button,
  Card,
  EmptyState,
  FilterChip,
  Modal,
  Pill,
} from "../components/ui";
import { useToast } from "../state/ToastContext";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "scan", label: "Scans" },
  { id: "cleanup", label: "Cleanup" },
  { id: "startup", label: "Startup" },
  { id: "disk", label: "Disk" },
  { id: "issues", label: "Warnings & errors" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const STATUS_ICON: Record<ActivityEntry["status"], LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const STATUS_COLOR: Record<ActivityEntry["status"], string> = {
  info: "text-accent",
  success: "text-success",
  warning: "text-warning",
  error: "text-danger",
};

export function ActivityLogScreen() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [filter, setFilter] = useState<FilterId>("all");
  const [confirmClear, setConfirmClear] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = () => {
    if (!isTauri()) {
      setLoaded(true);
      return;
    }
    api
      .getActivityLog()
      .then(setEntries)
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  };

  useEffect(refresh, []);

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    if (filter === "issues") {
      return entries.filter((entry) => entry.status === "warning" || entry.status === "error");
    }
    return entries.filter((entry) => entry.kind === (filter as ActivityKind));
  }, [entries, filter]);

  const grouped = useMemo(() => {
    const groups: { label: string; items: ActivityEntry[] }[] = [];
    for (const entry of filtered) {
      const label = dayLabel(entry.timestampMs);
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.items.push(entry);
      } else {
        groups.push({ label, items: [entry] });
      }
    }
    return groups;
  }, [filtered]);

  const countFor = (id: FilterId) => {
    if (id === "all") return entries.length;
    if (id === "issues") {
      return entries.filter((entry) => entry.status === "warning" || entry.status === "error")
        .length;
    }
    return entries.filter((entry) => entry.kind === id).length;
  };

  const copyLog = async () => {
    const text = filtered
      .map(
        (entry) =>
          `[${new Date(entry.timestampMs).toLocaleString()}] [${entry.status.toUpperCase()}] [${entry.kind}] ${entry.title} — ${entry.detail}`,
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text || "No activity recorded.");
      toast({ tone: "success", title: "Activity log copied to clipboard." });
    } catch (error) {
      toast({ tone: "error", title: "Could not copy the log.", details: [friendlyError(error)] });
    }
  };

  const clearLog = async () => {
    setConfirmClear(false);
    try {
      await api.clearActivityLog();
      setEntries([]);
      toast({ tone: "success", title: "Activity log cleared." });
    } catch (error) {
      toast({
        tone: "error",
        title: "Could not clear the log.",
        details: [friendlyError(error)],
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-4">
      {confirmClear && (
        <Modal
          title="Clear activity log?"
          subtitle="This removes the local history of scans and cleanups. It does not affect any files on disk."
          icon={Trash2}
          tone="danger"
          onClose={() => setConfirmClear(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={clearLog}>
                Clear history
              </Button>
            </>
          }
        />
      )}

      <Card className="animate-rise overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/10 px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((item) => (
              <FilterChip
                key={item.id}
                label={item.label}
                count={loaded ? countFor(item.id) : undefined}
                active={filter === item.id}
                onClick={() => setFilter(item.id)}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={refresh}>
              Refresh
            </Button>
            <Button variant="secondary" size="sm" icon={ClipboardCopy} onClick={copyLog}>
              Copy
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Trash2}
              onClick={() => setConfirmClear(true)}
              disabled={entries.length === 0}
            >
              Clear
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={entries.length === 0 ? "No activity yet" : "Nothing matches this filter"}
            description={
              entries.length === 0
                ? "Scans and cleanups will appear here. The history is stored locally and never leaves this PC."
                : "Try a different filter to see more events."
            }
          />
        ) : (
          <div className="clean-scrollbar max-h-[calc(100vh-280px)] overflow-y-auto">
            {grouped.map((group) => (
              <div key={group.label}>
                <div className="sticky top-0 z-10 border-b border-edge/10 bg-surface-2/95 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted backdrop-blur">
                  {group.label}
                </div>
                <div>
                  {group.items.map((entry) => {
                    const Icon = STATUS_ICON[entry.status];
                    return (
                      <div
                        key={entry.id}
                        className="timeline-rail data-row flex items-start gap-3 px-4 py-3"
                      >
                        <span className="relative z-10 grid h-4 w-4 shrink-0 place-items-center bg-surface">
                          <Icon className={`h-4 w-4 ${STATUS_COLOR[entry.status]}`} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-semibold text-ink">
                              {entry.title}
                            </span>
                            <Pill tone="neutral" className="shrink-0">
                              {entry.kind}
                            </Pill>
                            {entry.bytesFreed != null && entry.bytesFreed > 0 && (
                              <Pill tone="success" className="shrink-0">
                                {formatBytes(entry.bytesFreed)} freed
                              </Pill>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs leading-5 text-muted">{entry.detail}</p>
                        </div>
                        <span className="shrink-0 pt-0.5 text-xs font-medium text-muted">
                          {formatClock(entry.timestampMs)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="animate-rise px-1 text-xs text-muted">
        History is capped at 500 events and stored in your local app-data folder. CleanStart sends
        nothing anywhere.
      </p>
    </div>
  );
}
