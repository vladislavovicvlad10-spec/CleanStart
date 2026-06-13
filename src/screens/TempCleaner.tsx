import clsx from "clsx";
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  FileText,
  FolderCog,
  Info,
  Layers,
  MonitorCog,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { api, friendlyError, recordActivity } from "../lib/ipc";
import { formatBytes, formatCount } from "../lib/format";
import type {
  CleanResult,
  CleanupCategory,
  CleanupItem,
  CleanupOutcomeItem,
  CleanupScanResult,
} from "../lib/types";
import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  FilterChip,
  Modal,
  Notice,
  Pill,
  ProgressBar,
  SearchInput,
  StatTile,
} from "../components/ui";
import type { Tone } from "../components/ui";
import { useToast } from "../state/ToastContext";

const FILTERS = ["All", "Windows", "Browsers", "Applications", "System", "Other"] as const;
type Filter = (typeof FILTERS)[number];

type ScanStatus = "idle" | "scanning" | "ready" | "cleaning" | "error";

interface SelectableItem extends CleanupItem {
  selected: boolean;
  status?: "failed" | "skipped";
  statusMessage?: string;
}

interface ResultSummary {
  title: string;
  tone: "success" | "warning";
  movedCount: number;
  cleanedSize: number;
  failedCount: number;
  skippedCount: number;
  reasonSummary?: string;
  failedItems: CleanupOutcomeItem[];
  lockedCount: number;
  permissionDeniedCount: number;
  protectedCount: number;
}

const CATEGORY_TONE: Record<CleanupCategory, Tone> = {
  Windows: "accent",
  Browsers: "success",
  Applications: "neutral",
  System: "warning",
  Other: "neutral",
};

const CATEGORY_ICON: Record<CleanupCategory, LucideIcon> = {
  Windows: MonitorCog,
  Browsers: FileText,
  Applications: FolderCog,
  System: ShieldCheck,
  Other: Info,
};

function friendlyFailure(reason?: string | null): string {
  if (!reason) return "Some items could not be moved to the Recycle Bin.";
  const lower = reason.toLowerCase();
  if (lower.includes("recycle bin operation failed") || lower.includes("code 124")) {
    return "Locked or in use — close running apps and scan again.";
  }
  if (lower.includes("permission")) return "Windows denied access to this item.";
  if (lower.includes("missing")) return "The item disappeared before cleanup and was skipped.";
  if (lower.includes("locked") || lower.includes("in use")) {
    return "The file is locked by another app.";
  }
  return "Could not be moved to the Recycle Bin safely.";
}

function failureSummary(result: CleanResult): string | undefined {
  if (result.failedItems.length === 0) return undefined;
  if (result.lockedItems.length > 0 || result.permissionDeniedItems.length > 0) {
    return "Some temporary/cache files are locked or need permission. Close running browsers and apps, then scan again.";
  }
  return friendlyFailure(result.failedItems[0]?.reason);
}

export function TempCleanerScreen() {
  const { toast } = useToast();
  const [items, setItems] = useState<SelectableItem[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);
  const [scanErrors, setScanErrors] = useState<string[]>([]);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<ResultSummary | null>(null);

  const busy = scanStatus === "scanning" || scanStatus === "cleaning";
  const totalItemCount = items.reduce((total, item) => total + item.itemsCount, 0);
  const totalSizeBytes = items.reduce((total, item) => total + item.sizeBytes, 0);
  const selectedItems = items.filter((item) => item.selected && item.cleanable && !item.protected);
  const selectedSizeBytes = selectedItems.reduce((total, item) => total + item.sizeBytes, 0);
  const protectedCount = items.filter((item) => item.protected || !item.cleanable).length;

  const filteredItems = items.filter((item) => {
    const matchesFilter = filter === "All" || item.category === filter;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      item.name.toLowerCase().includes(query) ||
      item.displayPath.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const visibleSelectable = filteredItems.filter((item) => item.cleanable && !item.protected);
  const allVisibleSelected =
    visibleSelectable.length > 0 && visibleSelectable.every((item) => item.selected);
  const someVisibleSelected = visibleSelectable.some((item) => item.selected);

  const countFor = (category: Filter) =>
    category === "All" ? items.length : items.filter((item) => item.category === category).length;

  const applyScan = (scan: CleanupScanResult, failedById?: Map<string, string>) => {
    setItems(
      scan.items.map((item) => ({
        ...item,
        selected: item.cleanable && !item.protected && item.selectedByDefault,
        status: failedById?.has(item.id) ? ("failed" as const) : undefined,
        statusMessage: failedById?.get(item.id),
      })),
    );
    setScanWarnings(scan.warnings);
    setScanErrors(scan.errors);
  };

  const runScan = async () => {
    setScanStatus("scanning");
    setScanWarnings([]);
    setScanErrors([]);
    try {
      const scan = await api.scanTempPreview();
      applyScan(scan);
      setScanStatus("ready");
      recordActivity(
        "scan",
        "Temp preview scan completed",
        `${formatCount(scan.scannedCount, "entry", "entries")} reviewed · ${formatBytes(scan.totalSizeBytes)} found in approved locations.`,
        scan.errors.length > 0 ? "warning" : "success",
      );
      toast({
        tone: "success",
        title: "Preview scan completed — nothing was changed.",
        details: [
          `${formatCount(scan.scannedCount, "entry", "entries")} reviewed`,
          `${formatBytes(scan.totalSizeBytes)} found in approved locations`,
        ],
      });
    } catch (error) {
      const message = friendlyError(error);
      setScanStatus("error");
      setScanErrors([message]);
      recordActivity("scan", "Temp preview scan failed", message, "error");
      toast({ tone: "error", title: "Preview scan failed.", details: [message] });
    }
  };

  const runDryRun = async () => {
    if (selectedItems.length === 0) return;
    try {
      const dryRun = await api.dryRunCleanup(selectedItems);
      recordActivity(
        "scan",
        "Dry run completed",
        `${formatCount(dryRun.cleanableCount, "cleanable entry", "cleanable entries")} · ${formatBytes(dryRun.selectedSizeBytes)} would move to the Recycle Bin.`,
        "info",
      );
      toast({
        tone: "info",
        title: "Dry run complete. No files were touched.",
        details: [
          `${formatCount(dryRun.cleanableCount, "cleanable entry", "cleanable entries")}`,
          `${formatBytes(dryRun.selectedSizeBytes)} would move to the Recycle Bin`,
          `${dryRun.skippedCount} would be skipped`,
        ],
      });
    } catch (error) {
      toast({ tone: "error", title: "Dry run failed.", details: [friendlyError(error)] });
    }
  };

  const runCleanup = async () => {
    setConfirmOpen(false);
    setScanStatus("cleaning");
    try {
      const cleanResult = await api.cleanSelectedItems(selectedItems);
      const failedById = new Map(
        cleanResult.failedItems.map((item) => [item.id, friendlyFailure(item.reason)]),
      );

      try {
        const refreshed = await api.scanTempPreview();
        applyScan(refreshed, failedById);
      } catch {
        // Keep the current list if the refresh fails — cleanup already succeeded.
      }
      setScanStatus("ready");

      const hasIssues = cleanResult.failedCount > 0 || cleanResult.errors.length > 0;
      const title =
        hasIssues && cleanResult.removedCount > 0
          ? "Cleanup completed with warnings"
          : hasIssues
            ? "Cleanup could not complete"
            : "Cleanup completed";

      recordActivity(
        "cleanup",
        title,
        `${formatCount(cleanResult.removedCount, "item")} moved to the Recycle Bin · ${formatBytes(cleanResult.removedSizeBytes)} freed · ${cleanResult.failedCount} failed · ${cleanResult.skippedCount} skipped.`,
        hasIssues ? "warning" : "success",
        cleanResult.removedSizeBytes,
      );

      setResult({
        title,
        tone: hasIssues ? "warning" : "success",
        movedCount: cleanResult.removedCount,
        cleanedSize: cleanResult.removedSizeBytes,
        failedCount: cleanResult.failedCount,
        skippedCount: cleanResult.skippedCount,
        reasonSummary: failureSummary(cleanResult),
        failedItems: cleanResult.failedItems,
        lockedCount: cleanResult.lockedItems.length,
        permissionDeniedCount: cleanResult.permissionDeniedItems.length,
        protectedCount: cleanResult.protectedItems.length,
      });
    } catch (error) {
      const message = friendlyError(error);
      setScanStatus("error");
      recordActivity("cleanup", "Cleanup failed", message, "error");
      toast({ tone: "error", title: "Cleanup failed.", details: [message] });
    }
  };

  const toggleItem = (id: string, selected: boolean) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id && item.cleanable && !item.protected
          ? { ...item, selected, status: undefined, statusMessage: undefined }
          : item,
      ),
    );
  };

  const toggleVisible = () => {
    const visibleIds = new Set(visibleSelectable.map((item) => item.id));
    setItems((current) =>
      current.map((item) =>
        visibleIds.has(item.id)
          ? { ...item, selected: !allVisibleSelected, status: undefined, statusMessage: undefined }
          : item,
      ),
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-4">
      {confirmOpen && (
        <Modal
          title="Confirm cleanup"
          subtitle="Every selected path is revalidated by the backend before anything moves. Items go to the Recycle Bin — permanent deletion is disabled."
          icon={ShieldCheck}
          tone="accent"
          onClose={() => setConfirmOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button icon={Sparkles} onClick={runCleanup}>
                Move {formatBytes(selectedSizeBytes)} to Recycle Bin
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            <ConfirmMetric label="Selected groups" value={String(selectedItems.length)} />
            <ConfirmMetric label="Selected size" value={formatBytes(selectedSizeBytes)} />
            <ConfirmMetric label="Destination" value="Recycle Bin" />
          </div>
          <Notice tone="success" className="mt-3">
            Categories: {[...new Set(selectedItems.map((item) => item.category))].join(", ") || "None"}.
            You can restore everything from the Recycle Bin afterwards.
          </Notice>
        </Modal>
      )}

      {result && <ResultModal result={result} onClose={() => setResult(null)} />}

      {issuesOpen && (
        <Modal
          title="Scan details"
          subtitle="These folders or files were skipped safely."
          icon={AlertTriangle}
          tone="warning"
          wide
          onClose={() => setIssuesOpen(false)}
          footer={<Button onClick={() => setIssuesOpen(false)}>Close</Button>}
        >
          <div className="clean-scrollbar max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {[
              ...scanWarnings.map((message) => ({ tone: "warning" as Tone, message })),
              ...scanErrors.map((message) => ({ tone: "danger" as Tone, message })),
            ].map((issue, index) => (
              <Notice key={`${issue.tone}-${index}`} tone={issue.tone}>
                {issue.message}
              </Notice>
            ))}
          </div>
        </Modal>
      )}

      <section className="grid grid-cols-4 gap-4">
        <StatTile
          icon={Droplets}
          tone="accent"
          label="Items found"
          value={scanStatus === "idle" ? "—" : totalItemCount.toLocaleString()}
          delay={0}
        />
        <StatTile
          icon={Layers}
          tone="neutral"
          label="Total size"
          value={scanStatus === "idle" ? "—" : formatBytes(totalSizeBytes)}
          delay={40}
        />
        <StatTile
          icon={CheckCircle2}
          tone="success"
          label="Selected for cleanup"
          value={scanStatus === "idle" ? "—" : formatBytes(selectedSizeBytes)}
          delay={80}
        />
        <StatTile
          icon={ShieldCheck}
          tone="warning"
          label="Protected / skipped"
          value={scanStatus === "idle" ? "—" : String(protectedCount)}
          delay={120}
        />
      </section>

      {(scanWarnings.length > 0 || scanErrors.length > 0) && (
        <Card className="animate-rise flex items-center justify-between gap-4 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5 text-[13px] font-medium text-muted">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            <span className="truncate">
              {scanWarnings.length > 0 && (
                <strong className="text-ink">{scanWarnings.length} warning(s)</strong>
              )}
              {scanWarnings.length > 0 && scanErrors.length > 0 && " · "}
              {scanErrors.length > 0 && (
                <strong className="text-danger">{scanErrors.length} error(s)</strong>
              )}{" "}
              during scan — items were skipped safely
            </span>
          </div>
          <button
            onClick={() => setIssuesOpen(true)}
            className="shrink-0 text-[13px] font-semibold text-accent hover:text-accent-strong"
          >
            View details
          </button>
        </Card>
      )}

      <Card className="animate-rise overflow-hidden" style={{ animationDelay: "140ms" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/10 px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((chip) => (
              <FilterChip
                key={chip}
                label={chip}
                active={filter === chip}
                count={scanStatus === "ready" ? countFor(chip) : undefined}
                onClick={() => setFilter(chip)}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search names or paths"
              className="w-[260px]"
            />
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={runScan}
              disabled={busy}
              busy={scanStatus === "scanning"}
              title="Rescan approved locations"
            >
              {scanStatus === "idle" ? "Scan" : "Rescan"}
            </Button>
          </div>
        </div>

        {scanStatus === "scanning" && <ProgressBar indeterminate className="rounded-none" />}

        {scanStatus === "idle" ? (
          <EmptyState
            icon={Droplets}
            title="Start with a preview — it changes nothing"
            description="CleanStart scans only approved temporary and cache locations (Windows temp, browser caches). You review everything before any cleanup."
            action={
              <Button size="lg" icon={Droplets} onClick={runScan}>
                Preview temp files
              </Button>
            }
          />
        ) : scanStatus === "scanning" ? (
          <div className="grid min-h-[280px] place-items-center text-sm font-medium text-muted">
            Scanning approved temporary locations…
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={items.length === 0 ? "No safe temporary files found" : "No matches"}
            description={
              items.length === 0
                ? "Approved locations are already clean. That is a good thing."
                : "No entries match the current filter or search."
            }
            action={
              items.length === 0 ? (
                <Button variant="secondary" icon={RefreshCw} onClick={runScan}>
                  Scan again
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-edge/10">
            <div className="grid grid-cols-[44px_minmax(240px,1.6fr)_120px_90px_80px_minmax(180px,1fr)] items-center bg-surface-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-muted">
              <Checkbox
                checked={allVisibleSelected}
                mixed={!allVisibleSelected && someVisibleSelected}
                disabled={visibleSelectable.length === 0 || busy}
                ariaLabel="Select all visible items"
                onChange={toggleVisible}
              />
              <span>Name</span>
              <span>Category</span>
              <span>Size</span>
              <span>Items</span>
              <span>Path</span>
            </div>
            {filteredItems.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                index={index}
                busy={busy}
                onToggle={toggleItem}
              />
            ))}
          </div>
        )}
      </Card>

      {scanStatus !== "idle" && (
        <Card className="animate-rise flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 text-[13px] font-medium text-muted">
            <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
            <span>
              Only the selected temporary items move to the Recycle Bin. Personal folders are never
              touched.
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              icon={Info}
              onClick={runDryRun}
              disabled={busy || selectedItems.length === 0}
              title="Simulate the cleanup without changing anything"
            >
              Dry run
            </Button>
            <Button
              size="lg"
              icon={Sparkles}
              onClick={() => setConfirmOpen(true)}
              disabled={busy || selectedItems.length === 0}
              busy={scanStatus === "cleaning"}
            >
              {selectedItems.length === 0
                ? "Clean selected"
                : `Clean selected (${formatBytes(selectedSizeBytes)})`}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ItemRow({
  item,
  index,
  busy,
  onToggle,
}: {
  item: SelectableItem;
  index: number;
  busy: boolean;
  onToggle: (id: string, selected: boolean) => void;
}) {
  const Icon = CATEGORY_ICON[item.category];
  return (
    <div
      data-selected={item.selected && !item.status}
      style={{ ["--i" as string]: Math.min(index, 14) }}
      className={clsx(
        "data-row row-stagger grid min-h-[52px] grid-cols-[44px_minmax(240px,1.6fr)_120px_90px_80px_minmax(180px,1fr)] items-center px-4 py-1.5 text-sm",
        item.status === "failed" && "bg-danger/5",
        item.status === "skipped" && "bg-warning/5",
      )}
    >
      <Checkbox
        checked={item.selected}
        disabled={busy || item.protected || !item.cleanable}
        ariaLabel={`Select ${item.name}`}
        onChange={(selected) => onToggle(item.id, selected)}
      />
      <div className="flex min-w-0 items-center gap-3 pr-3">
        <span
          className={clsx(
            "grid h-7 w-7 shrink-0 place-items-center rounded-lg ring-1",
            item.selected
              ? "bg-accent/10 ring-accent/20 text-accent"
              : "bg-edge/[0.07] ring-edge/10 text-muted",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-ink">{item.name}</span>
            {item.protected && (
              <Pill tone="neutral" className="shrink-0">
                preview only
              </Pill>
            )}
            {item.status === "failed" && (
              <Pill tone="danger" className="shrink-0">
                failed
              </Pill>
            )}
          </div>
          <div className="truncate text-[11px] text-muted">
            {item.statusMessage ?? item.skipReason ?? item.warning ?? item.description}
          </div>
        </div>
      </div>
      <Pill tone={CATEGORY_TONE[item.category]} className="w-fit">
        {item.category}
      </Pill>
      <span className="text-[13px] font-semibold tabular-nums text-ink">
        {formatBytes(item.sizeBytes)}
      </span>
      <span className="text-[13px] tabular-nums text-muted">
        {item.itemsCount.toLocaleString()}
      </span>
      <span className="truncate pr-2 font-mono text-[11px] text-muted">
        {item.displayPath || item.path}
      </span>
    </div>
  );
}

function ConfirmMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5 shadow-[inset_0_1px_0_var(--card-topline)] ring-1 ring-edge/10">
      <div className="type-display text-base font-bold tabular-nums text-ink">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium text-muted">{label}</div>
    </div>
  );
}

function ResultModal({ result, onClose }: { result: ResultSummary; onClose: () => void }) {
  return (
    <Modal
      title={result.title}
      subtitle="Cleanup used the Recycle Bin only. Nothing was permanently deleted."
      icon={result.tone === "warning" ? AlertTriangle : CheckCircle2}
      tone={result.tone === "warning" ? "warning" : "success"}
      wide
      onClose={onClose}
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <div className="grid grid-cols-4 gap-3">
        <ConfirmMetric label="Moved" value={String(result.movedCount)} />
        <ConfirmMetric label="Space freed" value={formatBytes(result.cleanedSize)} />
        <ConfirmMetric label="Failed" value={String(result.failedCount)} />
        <ConfirmMetric label="Skipped" value={String(result.skippedCount)} />
      </div>

      {result.reasonSummary && (
        <Notice tone="warning" className="mt-3">
          {result.reasonSummary}
        </Notice>
      )}

      {(result.lockedCount > 0 || result.permissionDeniedCount > 0 || result.protectedCount > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {result.lockedCount > 0 && <Pill tone="warning">{result.lockedCount} locked / in use</Pill>}
          {result.permissionDeniedCount > 0 && (
            <Pill tone="danger">{result.permissionDeniedCount} permission denied</Pill>
          )}
          {result.protectedCount > 0 && (
            <Pill tone="accent">{result.protectedCount} protected / skipped</Pill>
          )}
        </div>
      )}

      {result.failedItems.length > 0 && (
        <details className="mt-3 rounded-xl border border-edge/10 bg-surface-2 px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold text-accent">
            View failed item details
          </summary>
          <div className="clean-scrollbar mt-2.5 max-h-[200px] space-y-2 overflow-y-auto pr-1">
            {result.failedItems.map((item, index) => (
              <div key={`${item.path}-${index}`} className="rounded-lg bg-surface px-3 py-2">
                <div className="truncate font-mono text-[11px] text-ink">{item.path}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {item.reason ?? "No error details were provided."}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </Modal>
  );
}
