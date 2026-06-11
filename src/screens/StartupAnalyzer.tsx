import clsx from "clsx";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  PauseCircle,
  RefreshCw,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, friendlyError, isTauri, recordActivity } from "../lib/ipc";
import { formatCount } from "../lib/format";
import type { StartupEntry } from "../lib/types";
import {
  Button,
  Card,
  EmptyState,
  Modal,
  Notice,
  Pill,
  ProgressBar,
  SearchInput,
  StatTile,
  Toggle,
} from "../components/ui";
import { useToast } from "../state/ToastContext";

type Status = "idle" | "scanning" | "ready" | "error";

interface PendingToggle {
  entry: StartupEntry;
  enabled: boolean;
}

export function StartupAnalyzerScreen() {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>("idle");
  const [entries, setEntries] = useState<StartupEntry[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<PendingToggle | null>(null);
  const [applying, setApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runScan = async () => {
    setStatus("scanning");
    setErrorMessage(null);
    try {
      const result = await api.scanStartupEntries();
      setEntries(result.entries);
      setWarnings(result.warnings);
      setStatus("ready");
      recordActivity(
        "startup",
        "Startup scan completed",
        `${formatCount(result.entries.length, "startup entry", "startup entries")} found. No changes were made.`,
        "success",
      );
    } catch (error) {
      setStatus("error");
      setErrorMessage(friendlyError(error));
    }
  };

  useEffect(() => {
    if (isTauri()) {
      void runScan();
    } else {
      setStatus("error");
      setErrorMessage(
        "Startup analysis needs the CleanStart desktop app running on Windows.",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter(
      (entry) =>
        entry.displayName.toLowerCase().includes(query) ||
        entry.command.toLowerCase().includes(query) ||
        entry.source.toLowerCase().includes(query),
    );
  }, [entries, search]);

  const stats = useMemo(
    () => ({
      total: entries.length,
      enabled: entries.filter((entry) => entry.enabled).length,
      disabled: entries.filter((entry) => !entry.enabled).length,
      readOnly: entries.filter((entry) => !entry.canToggle).length,
    }),
    [entries],
  );

  const applyToggle = async () => {
    if (!pending) return;
    setApplying(true);
    try {
      const updated = await api.setStartupEntryEnabled(
        pending.entry.location,
        pending.entry.name,
        pending.enabled,
      );
      setEntries((current) =>
        current.map((entry) => (entry.id === pending.entry.id ? { ...entry, ...updated } : entry)),
      );
      recordActivity(
        "startup",
        pending.enabled ? "Startup entry enabled" : "Startup entry disabled",
        `"${pending.entry.displayName}" (${pending.entry.source}). The original entry was kept — this is fully reversible.`,
        "success",
      );
      toast({
        tone: "success",
        title: pending.enabled
          ? `"${pending.entry.displayName}" will start with Windows again.`
          : `"${pending.entry.displayName}" will no longer start with Windows.`,
        details: ["Reversible at any time from CleanStart or Task Manager."],
      });
      setPending(null);
    } catch (error) {
      toast({
        tone: "error",
        title: "The startup entry could not be changed.",
        details: [friendlyError(error)],
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-4">
      {pending && (
        <Modal
          title={pending.enabled ? "Enable startup entry?" : "Disable startup entry?"}
          subtitle={
            pending.enabled
              ? "The app will launch automatically the next time Windows starts."
              : "The app will stop launching with Windows. It is not uninstalled or deleted, and you can re-enable it here any time."
          }
          icon={pending.enabled ? Rocket : PauseCircle}
          tone={pending.enabled ? "success" : "warning"}
          onClose={() => setPending(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setPending(null)} disabled={applying}>
                Cancel
              </Button>
              <Button onClick={applyToggle} busy={applying}>
                {pending.enabled ? "Enable" : "Disable"} entry
              </Button>
            </>
          }
        >
          <div className="rounded-xl bg-surface-2 p-3.5 ring-1 ring-edge/10">
            <div className="text-sm font-bold text-ink">{pending.entry.displayName}</div>
            <div className="mt-1 truncate font-mono text-[11px] text-muted">
              {pending.entry.command}
            </div>
            <div className="mt-2">
              <Pill tone="neutral">{pending.entry.source}</Pill>
            </div>
          </div>
          <Notice tone="success" className="mt-3">
            CleanStart uses the same reversible mechanism as Windows Task Manager. The original
            entry is never deleted.
          </Notice>
        </Modal>
      )}

      <section className="grid grid-cols-4 gap-4">
        <StatTile icon={Rocket} tone="accent" label="Startup entries" value={status === "ready" ? String(stats.total) : "—"} delay={0} />
        <StatTile icon={CheckCircle2} tone="success" label="Enabled" value={status === "ready" ? String(stats.enabled) : "—"} delay={40} />
        <StatTile icon={PauseCircle} tone="warning" label="Disabled" value={status === "ready" ? String(stats.disabled) : "—"} delay={80} />
        <StatTile icon={Lock} tone="neutral" label="Read-only (admin)" value={status === "ready" ? String(stats.readOnly) : "—"} delay={120} />
      </section>

      {warnings.length > 0 && (
        <Notice tone="warning" className="animate-rise">
          {warnings.join(" ")}
        </Notice>
      )}

      <Card className="animate-rise overflow-hidden" style={{ animationDelay: "140ms" }}>
        <div className="flex items-center justify-between gap-3 border-b border-edge/10 px-4 py-3">
          <div className="flex items-center gap-2.5 text-[13px] font-medium text-muted">
            <ShieldCheck className="h-4 w-4 text-success" />
            Changes are reversible — entries are toggled, never deleted.
          </div>
          <div className="flex items-center gap-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search startup entries"
              className="w-[260px]"
            />
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={runScan}
              disabled={status === "scanning"}
              busy={status === "scanning"}
            >
              Rescan
            </Button>
          </div>
        </div>

        {status === "scanning" && <ProgressBar indeterminate className="rounded-none" />}

        {status === "error" ? (
          <EmptyState
            icon={AlertTriangle}
            title="Startup entries are unavailable"
            description={errorMessage ?? "The startup scan could not be completed."}
            action={
              isTauri() ? (
                <Button variant="secondary" icon={RefreshCw} onClick={runScan}>
                  Try again
                </Button>
              ) : undefined
            }
          />
        ) : status !== "ready" ? (
          <div className="grid min-h-[280px] place-items-center text-sm font-medium text-muted">
            Reading Windows startup locations…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Rocket}
            title={entries.length === 0 ? "No startup entries found" : "No matches"}
            description={
              entries.length === 0
                ? "Nothing is registered to launch with Windows for this user."
                : "No entries match the current search."
            }
          />
        ) : (
          <div className="divide-y divide-edge/10">
            <div className="grid grid-cols-[minmax(260px,1.7fr)_180px_110px_90px] items-center bg-surface-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-muted">
              <span>Name &amp; command</span>
              <span>Source</span>
              <span>Status</span>
              <span className="text-right">Startup</span>
            </div>
            {filtered.map((entry) => (
              <StartupRow
                key={entry.id}
                entry={entry}
                onRequestToggle={(enabled) => setPending({ entry, enabled })}
              />
            ))}
          </div>
        )}
      </Card>

      <Notice tone="neutral" className="animate-rise">
        CleanStart reports what is registered to start with Windows. It does not rate apps, detect
        malware, or make performance claims — disable only what you recognize and do not need.
      </Notice>
    </div>
  );
}

function StartupRow({
  entry,
  onRequestToggle,
}: {
  entry: StartupEntry;
  onRequestToggle: (enabled: boolean) => void;
}) {
  return (
    <div
      className={clsx(
        "grid min-h-[56px] grid-cols-[minmax(260px,1.7fr)_180px_110px_90px] items-center px-4 py-2 transition-colors hover:bg-surface-2/60",
        !entry.enabled && "opacity-75",
      )}
    >
      <div className="min-w-0 pr-3">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-ink">{entry.displayName}</span>
          {!entry.canToggle && <Lock className="h-3 w-3 shrink-0 text-muted" />}
        </div>
        <div className="truncate font-mono text-[11px] text-muted">{entry.command}</div>
        {entry.note && <div className="mt-0.5 truncate text-[11px] text-muted/80">{entry.note}</div>}
      </div>
      <Pill tone="neutral" className="w-fit">
        {entry.source}
      </Pill>
      <Pill tone={entry.enabled ? "success" : "warning"} className="w-fit">
        {entry.enabled ? "Enabled" : "Disabled"}
      </Pill>
      <div className="flex justify-end">
        <Toggle
          checked={entry.enabled}
          disabled={!entry.canToggle}
          label={`Toggle startup for ${entry.displayName}`}
          onChange={(enabled) => onRequestToggle(enabled)}
        />
      </div>
    </div>
  );
}
