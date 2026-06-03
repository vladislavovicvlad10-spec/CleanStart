import clsx from "clsx";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Database,
  Droplets,
  Eye,
  FileText,
  Info,
  Languages,
  Layers,
  Lock,
  MoreVertical,
  RefreshCw,
  Rocket as RocketIcon,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  activityEvents,
  appPrinciples,
  diskItems,
  quickActions,
  screenCopy,
  settingRows,
  startupEntries,
  storageBreakdown,
  summaryCards,
} from "./data/mockData";
import {
  ActivityRow,
  AppShell,
  InspectorPanel,
  PageHeader,
  QuickActionTile,
  SummaryCard,
  SafetyBanner,
} from "./components/AppShell";
import {
  Button,
  GlassCard,
  IconBubble,
  SearchInput,
  StatusBadge,
  Table,
  Toggle,
} from "./components/ui";
import type { Accent, ScreenId, StartupEntry } from "./types/app";
import type { LucideIcon } from "lucide-react";

function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("dashboard");
  const [recycleBin, setRecycleBin] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("cleanstart.recycleBin") !== "false";
  });
  const [startupSearch, setStartupSearch] = useState("");
  const [logFilter, setLogFilter] = useState("All");
  const [tempLastScanTime, setTempLastScanTime] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("cleanstart.tempLastScanTime");
  });

  useEffect(() => {
    if ("__TAURI_INTERNALS__" in window) {
      invoke<{ moveToRecycleBin: boolean }>("get_cleanup_settings")
        .then((settings) => setRecycleBin(settings.moveToRecycleBin))
        .catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("cleanstart.recycleBin", String(recycleBin));
    if ("__TAURI_INTERNALS__" in window) {
      void invoke("save_cleanup_settings", { settings: { moveToRecycleBin: recycleBin } });
    }
  }, [recycleBin]);

  return (
    <AppShell
      activeScreen={activeScreen}
      onNavigate={setActiveScreen}
      recycleBin={recycleBin}
      onRecycleBinChange={setRecycleBin}
      lastScanTime={tempLastScanTime}
    >
      {activeScreen === "dashboard" && (
        <DashboardScreen onNavigate={setActiveScreen} />
      )}
      {activeScreen === "temp" && (
        <TempCleanerScreen
          recycleBin={recycleBin}
          lastScanTime={tempLastScanTime}
          onLastScanTimeChange={setTempLastScanTime}
        />
      )}
      {activeScreen === "startup" && (
        <StartupAnalyzerScreen search={startupSearch} setSearch={setStartupSearch} />
      )}
      {activeScreen === "disk" && <DiskAnalyzerScreen />}
      {activeScreen === "activity" && (
        <ActivityLogScreen logFilter={logFilter} setLogFilter={setLogFilter} />
      )}
      {activeScreen === "settings" && (
        <SettingsScreen recycleBin={recycleBin} setRecycleBin={setRecycleBin} />
      )}
    </AppShell>
  );
}

function DashboardScreen({
  onNavigate,
}: {
  onNavigate: (screen: ScreenId) => void;
}) {
  const actionTarget = (title: string): ScreenId => {
    if (title.includes("Temp")) return "temp";
    if (title.includes("Startup")) return "startup";
    if (title.includes("Disk")) return "disk";
    if (title.includes("Activity")) return "activity";
    return "settings";
  };

  return (
    <div className="dashboard-layout mx-auto w-full max-w-none space-y-3">
      <section className="grid min-h-[248px] grid-cols-[minmax(0,0.96fr)_minmax(500px,1.04fr)] items-center gap-8" data-check-overlap="hero">
        <div className="max-w-[680px] justify-self-start">
          <h1 className="max-w-[720px] text-[clamp(2.25rem,2.55vw,3.15rem)] font-black leading-[1.06] tracking-tight text-ink">
            Keep your PC clean, fast, and running at its best.
          </h1>
          <p className="mt-4 text-lg font-medium text-muted">
            {screenCopy.dashboard}. Preview first, confirm always.
          </p>
          <div className="mt-4 max-w-[540px]">
            <SafetyBanner compact>
              <strong>CleanStart is an advisor and cleanup helper.</strong>
              <span className="mt-1 block">It does not replace antivirus and does not detect malware.</span>
            </SafetyBanner>
          </div>
        </div>
        <div className="hero-art-stage relative hidden h-[266px] w-full items-center justify-center overflow-visible xl:flex">
          <div className="absolute left-1/2 top-1/2 h-[210px] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-[999px] bg-blue-300/16 blur-[60px]" />
          <div className="absolute left-1/2 top-[54%] h-[172px] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-[999px] bg-white/30 blur-[42px]" />
          <img
            src="/assets/hero-floating.png"
            alt=""
            className="hero-reference-visual relative mx-auto h-[300px] w-full max-w-[650px] object-contain opacity-95 drop-shadow-[0_28px_58px_rgba(30,105,220,0.25)]"
          />
        </div>
      </section>

      <section className="grid grid-cols-5 gap-4" data-check-overlap="summary-row">
        {summaryCards.map((card) => (
          <SummaryCard key={card.title} card={card} onAction={() => onNavigate(actionTarget(card.title))} />
        ))}
      </section>

      <section className="grid grid-cols-[1fr_1fr] items-start gap-4" data-check-overlap="lower-row">
        <GlassCard className="h-fit p-4" data-check-overlap="quick-actions">
          <div className="mb-3 flex items-center gap-3">
            <IconBubble icon={RefreshCw} accent="blue" size="sm" />
            <h2 className="text-xl font-black text-ink">Quick actions</h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <QuickActionTile
                key={action.label}
                label={action.label}
                icon={action.icon}
                accent={action.accent}
                onClick={() => onNavigate(action.target)}
              />
            ))}
          </div>
          <div className="mt-3">
            <SafetyBanner compact>
              <strong>Review before deleting.</strong>
              <span className="block">Cleanup uses Recycle Bin when supported.</span>
            </SafetyBanner>
          </div>
        </GlassCard>

        <GlassCard className="p-4" data-check-overlap="recent-activity">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconBubble icon={RefreshCw} accent="blue" size="sm" />
              <h2 className="text-xl font-black text-ink">Recent activity</h2>
            </div>
            <Button variant="secondary" onClick={() => onNavigate("activity")} className="h-9 px-4">
              View all
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-blue-100/80 bg-white/45">
            {activityEvents.slice(0, 4).map((event) => (
              <ActivityRow key={`${event.title}-${event.time}`} event={event} />
            ))}
          </div>
        </GlassCard>
      </section>
    </div>
  );
}

const cleanupFilters = ["All", "Windows", "Browsers", "Applications", "System", "Other"] as const;
type CleanupFilter = (typeof cleanupFilters)[number];

type CleanupItem = {
  id: string;
  name: string;
  description: string;
  category: CleanupCategory;
  source: string;
  path: string;
  displayPath: string;
  sizeBytes: number;
  itemsCount: number;
  itemType: "file" | "folder" | "group";
  cleanable: boolean;
  protected: boolean;
  selectedByDefault: boolean;
  skipReason?: string;
  warning?: string;
  lastModified?: string;
  selected: boolean;
  status?: "cleaned" | "failed" | "skipped";
  statusMessage?: string;
};

type ToastState = {
  title: string;
  details?: string[];
};

type CleanupCategory = Exclude<CleanupFilter, "All">;

type ScanStatus = "idle" | "scanning" | "ready" | "cleaning" | "error";

type CleanupResult = {
  scannedCount: number;
  totalSizeBytes: number;
  cleanableCount: number;
  protectedCount: number;
  warnings: string[];
  errors: string[];
  items: Omit<CleanupItem, "selected" | "status" | "statusMessage">[];
};

type DryRunResult = {
  selectedCount: number;
  selectedSizeBytes: number;
  cleanableCount: number;
  skippedCount: number;
  warnings: string[];
  skippedItems: CleanupOutcomeItem[];
};

type CleanResult = {
  removedCount: number;
  removedSizeBytes: number;
  failedCount: number;
  skippedCount: number;
  warnings: string[];
  errors: string[];
  removedItems: CleanupOutcomeItem[];
  failedItems: CleanupOutcomeItem[];
  skippedItems: CleanupOutcomeItem[];
  lockedItems: CleanupOutcomeItem[];
  permissionDeniedItems: CleanupOutcomeItem[];
  protectedItems: CleanupOutcomeItem[];
};

type CleanupOutcomeItem = {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  reason?: string;
};

type CleanupResultSummary = {
  title: string;
  tone: "success" | "warning" | "error";
  movedCount: number;
  cleanedSize: number;
  failedCount: number;
  skippedCount: number;
  reasonSummary?: string;
  failedItems: CleanupOutcomeItem[];
  lockedCount: number;
  permissionDeniedCount: number;
  protectedCount: number;
};

function TempCleanerScreen({
  recycleBin,
  lastScanTime,
  onLastScanTimeChange,
}: {
  recycleBin: boolean;
  lastScanTime: string | null;
  onLastScanTimeChange: (time: string) => void;
}) {
  const [items, setItems] = useState<CleanupItem[]>([]);
  const [filter, setFilter] = useState<CleanupFilter>("All");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmCleanupOpen, setConfirmCleanupOpen] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResultSummary | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);
  const [scanErrors, setScanErrors] = useState<string[]>([]);
  const [scanDetailsOpen, setScanDetailsOpen] = useState(false);
  const totalItemCount = items.reduce((total, item) => total + item.itemsCount, 0);
  const totalSizeBytes = items.reduce((total, item) => total + item.sizeBytes, 0);
  const selectedItems = items.filter((item) => item.selected && item.cleanable && !item.protected);
  const selectedEntryCount = selectedItems.length;
  const selectedSizeBytes = selectedItems.reduce((total, item) => total + item.sizeBytes, 0);
  const skippedSizeBytes = Math.max(totalSizeBytes - selectedSizeBytes, 0);
  const protectedOrSkippedCount = items.filter((item) => item.protected || !item.selected).length;
  const filteredItems = items.filter((item) => {
    const matchesFilter = filter === "All" || item.category === filter;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      item.name.toLowerCase().includes(query) ||
      item.path.toLowerCase().includes(query) ||
      item.displayPath.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });
  const visibleSelectableItems = filteredItems.filter((item) => item.cleanable && !item.protected);
  const allVisibleSelected = visibleSelectableItems.length > 0 && visibleSelectableItems.every((item) => item.selected);
  const someVisibleSelected = visibleSelectableItems.some((item) => item.selected);
  const cleanDisabled = selectedEntryCount === 0;
  const busy = scanStatus === "scanning" || scanStatus === "cleaning";

  const showToast = (title: string, details?: string[]) => {
    setToast({ title, details });
    window.setTimeout(() => setToast(null), 4200);
  };

  const addActivityLog = (type: string, title: string, description: string, severity: "info" | "success" | "warning" | "error") => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: new Date().toISOString(),
      type,
      title,
      description,
      severity,
    };
    const current = JSON.parse(window.localStorage.getItem("cleanstart.activityLog") ?? "[]") as unknown[];
    window.localStorage.setItem("cleanstart.activityLog", JSON.stringify([entry, ...current].slice(0, 80)));
  };

  const applyScanResult = (result: CleanupResult, failedById?: Map<string, string>) => {
    const nextItems = result.items.map((item) => ({
      ...item,
      selected: item.cleanable && !item.protected && item.selectedByDefault,
      status: failedById?.has(item.id) ? ("failed" as const) : undefined,
      statusMessage: failedById?.get(item.id),
    }));
    setItems(nextItems);
    setScanWarnings(result.warnings);
    setScanErrors(result.errors);
    const completedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    onLastScanTimeChange(completedAt);
    window.localStorage.setItem("cleanstart.tempLastScanTime", completedAt);
    return completedAt;
  };

  const runPreviewScan = async () => {
    setScanStatus("scanning");
    setScanWarnings([]);
    setScanErrors([]);
    addActivityLog("temp_scan_started", "Temp scan started", "Scanning approved temporary locations only.", "info");
    try {
      const result = await invoke<CleanupResult>("scan_temp_preview");
      const completedAt = applyScanResult(result);
      setScanStatus("ready");
      addActivityLog(
        "temp_scan_completed",
        "Temp scan completed",
        `Completed at ${completedAt}. ${result.scannedCount} entries reviewed. ${formatBytes(result.totalSizeBytes)} found.`,
        result.errors.length > 0 || result.warnings.length > 0 ? "warning" : "success",
      );
      showToast("Preview scan completed.", [
        `${result.scannedCount} entries reviewed`,
        `${formatBytes(result.totalSizeBytes)} found in approved locations`,
        `${result.warnings.length} warning(s)`,
      ]);
    } catch (error) {
      const message = friendlyError(error);
      setScanStatus("error");
      setScanErrors([message]);
      addActivityLog("temp_scan_failed", "Temp scan failed", message, "error");
      showToast("Preview scan failed.", [message]);
    }
  };

  const updateItemSelection = (id: string, selected: boolean) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id && item.cleanable && !item.protected ? { ...item, selected, status: undefined, statusMessage: undefined } : item,
      ),
    );
  };

  const toggleVisibleSelection = () => {
    const visibleIds = new Set(visibleSelectableItems.map((item) => item.id));
    setItems((current) =>
      current.map((item) =>
        visibleIds.has(item.id) ? { ...item, selected: !allVisibleSelected, status: undefined, statusMessage: undefined } : item,
      ),
    );
  };

  const runDryRun = async () => {
    if (selectedEntryCount === 0) {
      showToast("Select items first.", ["Dry run needs at least one cleanable selected item."]);
      return;
    }
    addActivityLog("temp_dry_run_started", "Dry run started", `${selectedEntryCount} selected entries.`, "info");
    try {
      const result = await invoke<DryRunResult>("dry_run_cleanup", { selectedItems });
      addActivityLog(
        "temp_dry_run_completed",
        "Dry run completed",
        `${result.cleanableCount} cleanable entries. ${formatBytes(result.selectedSizeBytes)} selected.`,
        result.warnings.length > 0 ? "warning" : "success",
      );
      showToast("Dry run complete. No files were changed.", [
        `${result.cleanableCount} cleanable entries`,
        `${formatBytes(result.selectedSizeBytes)} selected cleanup`,
        `${result.skippedCount} skipped entries`,
        `Recycle Bin preference: ${recycleBin ? "enabled" : "disabled"}`,
        ...result.warnings.slice(0, 2),
      ]);
    } catch (error) {
      const message = friendlyError(error);
      addActivityLog("temp_dry_run_failed", "Dry run failed", message, "error");
      showToast("Dry run failed.", [message]);
    }
  };

  const confirmCleanup = async () => {
    setConfirmCleanupOpen(false);
    setScanStatus("cleaning");
    addActivityLog("temp_cleanup_started", "Cleanup started", `${selectedEntryCount} selected entries.`, "info");
    try {
      const result = await invoke<CleanResult>("clean_selected_items", {
        selectedItems,
        options: { moveToRecycleBin: recycleBin },
      });
      const removedIds = new Set(result.removedItems.map((item) => item.id));
      const failedById = new Map(result.failedItems.map((item) => [item.id, friendlyCleanupFailureMessage(item.reason)]));
      const skippedById = new Map(result.skippedItems.map((item) => [item.id, item.reason ?? "Cleanup skipped."]));
      setItems((current) =>
        current
          .filter((item) => !removedIds.has(item.id))
          .map((item) => {
            if (failedById.has(item.id)) {
              return { ...item, selected: false, status: "failed" as const, statusMessage: failedById.get(item.id) };
            }
            if (skippedById.has(item.id)) {
              return { ...item, selected: false, status: "skipped" as const, statusMessage: skippedById.get(item.id) };
            }
            return item;
          }),
      );
      try {
        const refreshed = await invoke<CleanupResult>("scan_temp_preview");
        applyScanResult(refreshed, failedById);
        setScanStatus("ready");
      } catch (refreshError) {
        setScanStatus("ready");
        setScanErrors((current) => [...current, `Refresh after cleanup failed: ${friendlyError(refreshError)}`]);
      }
      const severity = result.failedCount > 0 || result.errors.length > 0 ? "warning" : "success";
      const title =
        result.failedCount > 0 && result.removedCount > 0
          ? "Cleanup completed with warnings"
          : result.failedCount > 0
            ? "Cleanup could not complete"
            : "Cleanup completed";
      const reasonSummary = cleanupFailureSummary(result);
      addActivityLog(
        severity === "warning" ? "temp_cleanup_partially_failed" : "temp_cleanup_completed",
        title,
        `${result.removedCount} moved. ${result.failedCount} failed. ${result.skippedCount} skipped.`,
        severity,
      );
      setCleanupResult({
        title,
        tone: severity,
        movedCount: result.removedCount,
        cleanedSize: result.removedSizeBytes,
        failedCount: result.failedCount,
        skippedCount: result.skippedCount,
        reasonSummary,
        failedItems: result.failedItems,
        lockedCount: result.lockedItems.length,
        permissionDeniedCount: result.permissionDeniedItems.length,
        protectedCount: result.protectedItems.length,
      });
      showToast(title, [
        `${result.removedCount} item(s) moved to Recycle Bin`,
        `${formatBytes(result.removedSizeBytes)} cleaned`,
        `${result.skippedCount} skipped`,
        `${result.failedCount} failed`,
        ...(reasonSummary ? [reasonSummary] : []),
        ...result.warnings.slice(0, 1),
      ]);
    } catch (error) {
      const message = friendlyError(error);
      setScanStatus("error");
      addActivityLog("temp_cleanup_failed", "Cleanup failed", message, "error");
      showToast("Cleanup failed.", [message]);
    }
  };

  return (
    <ScreenLayout>
      <div className="relative space-y-3" data-screen="temp-cleaner">
        {toast && <Toast message={toast} />}
        {confirmCleanupOpen && (
          <CleanupConfirmModal
            selectedEntryCount={selectedEntryCount}
            selectedSizeBytes={selectedSizeBytes}
            selectedCategories={[...new Set(selectedItems.map((item) => item.category))]}
            recycleBin={recycleBin}
            onCancel={() => setConfirmCleanupOpen(false)}
            onConfirm={confirmCleanup}
          />
        )}
        {cleanupResult && <CleanupResultModal result={cleanupResult} onClose={() => setCleanupResult(null)} />}
        {scanDetailsOpen && (
          <ScanIssuesModal warnings={scanWarnings} errors={scanErrors} onClose={() => setScanDetailsOpen(false)} />
        )}

        <section className="grid min-h-[132px] grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] items-center gap-8">
          <div>
            <h1 className="text-[clamp(1.95rem,2.05vw,2.6rem)] font-black leading-tight tracking-tight text-ink">
              Temp Cleaner
            </h1>
            <p className="mt-2.5 max-w-[760px] text-base font-medium text-muted">
              Review and safely clean temporary files to free up space and improve performance.
            </p>
          </div>
          <div className="hero-art-stage relative hidden h-[150px] items-center justify-center overflow-visible xl:flex">
            <div className="absolute h-36 w-[68%] rounded-full bg-blue-300/18 blur-[62px]" />
            <div className="absolute h-24 w-[48%] rounded-full bg-white/45 blur-[36px]" />
            <img
              src="/assets/hero-floating.png"
              alt=""
              className="hero-reference-visual relative h-[205px] w-full max-w-[430px] object-contain opacity-82 drop-shadow-[0_24px_44px_rgba(37,99,235,0.18)]"
            />
          </div>
        </section>

        <section className="grid grid-cols-4 gap-3">
          <TempSummaryCard icon={Droplets} title="Items found" value={String(totalItemCount)} accent="blue" />
          <TempSummaryCard icon={Layers} title="Total size" value={formatBytes(totalSizeBytes)} accent="purple" />
          <TempSummaryCard icon={CheckCircle2} title="Selected cleanup" value={formatBytes(selectedSizeBytes)} accent="green" />
          <TempSummaryCard icon={ShieldCheck} title="Protected / Skipped" value={String(protectedOrSkippedCount)} accent="green" />
        </section>

        {(scanWarnings.length > 0 || scanErrors.length > 0) && (
          <ScanIssueSummary warnings={scanWarnings} errors={scanErrors} onViewDetails={() => setScanDetailsOpen(true)} />
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-3">
          <div className="space-y-3">
            <GlassCard className="overflow-hidden p-2.5">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {cleanupFilters.map((chip) => (
                    <FilterChip key={chip} label={chip} active={filter === chip} onClick={() => setFilter(chip)} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <SearchInput value={search} onChange={setSearch} placeholder="Search files or paths" />
                  <button
                    aria-label="Refresh safe temp preview"
                    onClick={() => {
                      setSearch("");
                      void runPreviewScan();
                    }}
                    disabled={busy}
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-blue-100 bg-white/75 text-slate-600 shadow-soft transition hover:bg-blue-50 hover:text-blue-700"
                  >
                    <RefreshCw className={clsx("h-5 w-5", scanStatus === "scanning" && "animate-spin")} />
                  </button>
                </div>
              </div>
              <CleanupTable
                items={filteredItems}
                allVisibleSelected={allVisibleSelected}
                someVisibleSelected={someVisibleSelected}
                scanStatus={scanStatus}
                busy={busy}
                onPreview={runPreviewScan}
                onToggleAll={toggleVisibleSelection}
                onToggleItem={updateItemSelection}
              />
              <div className="mt-2.5">
                <SafetyBanner compact>
                  <strong>Review before cleaning.</strong>
                  <span className="ml-1">
                    CleanStart will only remove selected temporary files and will never delete personal or important data.
                  </span>
                </SafetyBanner>
              </div>
            </GlassCard>

            <GlassCard className="flex flex-wrap items-center justify-between gap-3 p-2.5">
              <div className="flex flex-wrap gap-3">
                <ActionButton
                  icon={Info}
                  title="Dry run"
                  subtitle="See what will be cleaned"
                  onClick={runDryRun}
                  disabled={busy || cleanDisabled}
                />
                <ActionButton
                  icon={SettingsIcon}
                  title="Preview scan"
                  subtitle={lastScanTime ? `Last scan ${lastScanTime}` : "Scan approved locations"}
                  onClick={runPreviewScan}
                  disabled={busy}
                />
              </div>
              <button
                onClick={() => setConfirmCleanupOpen(true)}
                disabled={cleanDisabled || busy}
                className={clsx(
                  "flex min-h-[54px] min-w-[300px] items-center gap-3 rounded-2xl px-5 text-left text-white shadow-soft transition",
                  cleanDisabled
                    ? "cursor-not-allowed bg-slate-300 text-white/80 shadow-none"
                    : "bg-gradient-to-r from-blue-500 to-blue-700 hover:-translate-y-0.5 hover:from-blue-500 hover:to-blue-600",
                )}
              >
                <Sparkles className="h-6 w-6 shrink-0" />
                <span>
                  <span className="block text-sm font-black">
                    {cleanDisabled ? "Clean selected" : `Clean selected (${formatBytes(selectedSizeBytes)})`}
                  </span>
                  <span className="block text-xs font-semibold text-blue-100">
                    {scanStatus === "cleaning"
                      ? "Moving selected items to Recycle Bin"
                      : cleanDisabled
                        ? "Select entries first"
                        : "Preview-first cleanup"}
                  </span>
                </span>
              </button>
            </GlassCard>
          </div>

          <aside className="space-y-3">
            <SelectionSummary selectedBytes={selectedSizeBytes} skippedBytes={skippedSizeBytes} totalBytes={totalSizeBytes} />
            <SafetyCard />
          </aside>
        </div>
      </div>
    </ScreenLayout>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

function friendlyError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "The operation could not be completed safely.";
}

function friendlyCleanupFailureMessage(reason?: string) {
  if (!reason) return "Some items could not be moved to Recycle Bin.";
  const lower = reason.toLowerCase();
  if (lower.includes("recycle bin operation failed") || lower.includes("code 124")) {
    return "Some temporary/cache files could not be cleaned because they are locked or require permission.";
  }
  if (lower.includes("permission")) {
    return "Some items could not be moved because Windows denied access.";
  }
  if (lower.includes("missing")) {
    return "Some items disappeared before cleanup and were skipped.";
  }
  if (lower.includes("locked")) {
    return "Some files appear to be locked by another app.";
  }
  return "Some items could not be moved to Recycle Bin safely.";
}

function cleanupFailureSummary(result: CleanResult) {
  const failedItems = result.failedItems;
  if (failedItems.length === 0) return undefined;
  const reasons = failedItems.map((item) => friendlyCleanupFailureMessage(item.reason));
  const hasBrowserOrRecycleFailure = failedItems.some((item) => {
    const text = `${item.name} ${item.path} ${item.reason ?? ""}`.toLowerCase();
    return text.includes("cache") || text.includes("edge") || text.includes("chrome") || text.includes("firefox") || text.includes("brave") || text.includes("code 124");
  });

  if (hasBrowserOrRecycleFailure) {
    return "Some temporary/cache files could not be cleaned because they are currently locked or require permission. Close running browsers/apps and scan again.";
  }

  if (result.lockedItems.length > 0 || result.permissionDeniedItems.length > 0) {
    return "Some temporary/cache files could not be cleaned because they are locked or require permission. Close running browsers/apps and scan again.";
  }

  return [...new Set(reasons)][0];
}

function categoryAccent(category: CleanupCategory): Accent {
  if (category === "Browsers") return "green";
  if (category === "Applications") return "purple";
  if (category === "System") return "orange";
  if (category === "Other") return "slate";
  return "blue";
}

function categoryIcon(category: CleanupCategory): LucideIcon {
  if (category === "Browsers") return FileText;
  if (category === "Applications") return SettingsIcon;
  if (category === "System") return ShieldCheck;
  if (category === "Other") return Info;
  return Droplets;
}

function Toast({ message }: { message: ToastState }) {
  return (
    <div className="fixed left-1/2 top-24 z-50 w-[min(430px,calc(100vw-48px))] -translate-x-1/2 rounded-3xl border border-blue-100 bg-white/95 px-5 py-4 text-sm text-ink shadow-glass backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <IconBubble icon={CheckCircle2} accent="green" size="sm" />
        <div className="min-w-0">
          <div className="font-black">{message.title}</div>
          {message.details && message.details.length > 0 && (
            <div className="mt-2 space-y-1 text-xs font-semibold text-muted">
              {message.details.map((detail) => (
                <div key={detail}>{detail}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScanIssueSummary({
  warnings,
  errors,
  onViewDetails,
}: {
  warnings: string[];
  errors: string[];
  onViewDetails: () => void;
}) {
  return (
    <GlassCard className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm font-semibold">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0 text-muted">
          {warnings.length > 0 && <span className="font-black text-ink">{issueCountLabel(warnings.length, "warning")}</span>}
          {warnings.length > 0 && errors.length > 0 && <span> · </span>}
          {errors.length > 0 && (
            <span>
              <span className="font-black text-rose-700">{issueCountLabel(errors.length, "error")}</span>
            </span>
          )}
          <span> during scan</span>
        </div>
      </div>
      <button className="shrink-0 text-sm font-black text-blue-700 hover:text-blue-800" onClick={onViewDetails}>
        View details
      </button>
    </GlassCard>
  );
}

function ScanIssuesModal({
  warnings,
  errors,
  onClose,
}: {
  warnings: string[];
  errors: string[];
  onClose: () => void;
}) {
  const issueRows = [
    ...warnings.map((message) => ({ tone: "warning" as const, message })),
    ...errors.map((message) => ({ tone: "error" as const, message })),
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/18 px-6 backdrop-blur-sm">
      <div className="w-full max-w-[640px] rounded-[2rem] border border-white/80 bg-white/95 p-5 text-ink shadow-glass">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <IconBubble icon={AlertTriangle} accent="orange" size="md" />
            <div>
              <h2 className="text-xl font-black tracking-tight">Scan details</h2>
              <p className="mt-1 text-sm font-semibold text-muted">Some folders or files were skipped safely.</p>
            </div>
          </div>
          <button
            aria-label="Close scan details"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-2xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 max-h-[320px] space-y-2 overflow-y-auto pr-1 clean-scrollbar">
          {issueRows.map((issue, index) => (
            <div
              key={`${issue.tone}-${index}-${issue.message}`}
              className={clsx(
                "rounded-2xl px-4 py-3 text-sm font-semibold leading-5 ring-1",
                issue.tone === "error"
                  ? "bg-rose-50 text-rose-800 ring-rose-100"
                  : "bg-amber-50 text-amber-800 ring-amber-100",
              )}
            >
              {issue.message}
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="h-10 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-soft transition hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CleanupResultModal({
  result,
  onClose,
}: {
  result: CleanupResultSummary;
  onClose: () => void;
}) {
  const Icon = result.tone === "warning" ? AlertTriangle : CheckCircle2;
  const accent: Accent = result.tone === "warning" ? "orange" : result.tone === "error" ? "slate" : "green";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/18 px-6 backdrop-blur-sm">
      <div className="w-full max-w-[620px] rounded-[2rem] border border-white/80 bg-white/95 p-5 text-ink shadow-glass">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <IconBubble icon={Icon} accent={accent} size="md" />
            <div>
              <h2 className="text-xl font-black tracking-tight">{result.title}</h2>
              <p className="mt-1 text-sm font-semibold text-muted">
                Cleanup used Recycle Bin only. No permanent deletion was performed.
              </p>
            </div>
          </div>
          <button
            aria-label="Close cleanup result"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-2xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          <ResultMetric label="Moved" value={String(result.movedCount)} />
          <ResultMetric label="Cleaned size" value={formatBytes(result.cleanedSize)} />
          <ResultMetric label="Failed" value={String(result.failedCount)} tone={result.failedCount > 0 ? "warning" : "normal"} />
          <ResultMetric label="Skipped" value={String(result.skippedCount)} />
        </div>

        {result.reasonSummary && (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold leading-5 text-amber-800">
            {result.reasonSummary}
          </div>
        )}

        {(result.lockedCount > 0 || result.permissionDeniedCount > 0 || result.protectedCount > 0) && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
            {result.lockedCount > 0 && (
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 ring-1 ring-amber-100">
                {result.lockedCount} locked/in-use
              </span>
            )}
            {result.permissionDeniedCount > 0 && (
              <span className="rounded-full bg-rose-50 px-3 py-1.5 text-rose-700 ring-1 ring-rose-100">
                {result.permissionDeniedCount} permission denied
              </span>
            )}
            {result.protectedCount > 0 && (
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700 ring-1 ring-blue-100">
                {result.protectedCount} protected/skipped
              </span>
            )}
          </div>
        )}

        {result.failedItems.length > 0 && (
          <details className="mt-4 rounded-2xl border border-blue-100 bg-white/70 px-4 py-3 text-sm">
            <summary className="cursor-pointer font-black text-blue-700">View failed item details</summary>
            <div className="mt-3 max-h-[220px] space-y-2 overflow-y-auto pr-1 clean-scrollbar">
              {result.failedItems.map((item, index) => (
                <div key={`${item.path}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2 font-semibold text-slate-600">
                  <div className="truncate text-ink">{item.path}</div>
                  <div className="mt-1 text-xs">{item.reason ?? "No raw error code was provided."}</div>
                </div>
              ))}
            </div>
          </details>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="h-10 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-soft transition hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultMetric({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: string;
  tone?: "normal" | "warning";
}) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/45 px-3 py-3">
      <div className={clsx("text-lg font-black", tone === "warning" ? "text-amber-700" : "text-ink")}>{value}</div>
      <div className="mt-1 text-xs font-semibold text-muted">{label}</div>
    </div>
  );
}

function issueCountLabel(count: number, label: string) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function CleanupConfirmModal({
  selectedEntryCount,
  selectedSizeBytes,
  selectedCategories,
  recycleBin,
  onCancel,
  onConfirm,
}: {
  selectedEntryCount: number;
  selectedSizeBytes: number;
  selectedCategories: CleanupCategory[];
  recycleBin: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/18 px-6 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-[2rem] border border-white/80 bg-white/95 p-6 text-ink shadow-glass">
        <div className="flex items-start gap-4">
          <IconBubble icon={ShieldCheck} accent="blue" size="lg" />
          <div className="min-w-0">
            <h2 className="text-2xl font-black tracking-tight">Confirm cleanup</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted">
              CleanStart will revalidate every selected path in the backend and only move approved temporary
              items to Recycle Bin when supported.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50/55 p-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="font-black text-ink">{selectedEntryCount}</div>
              <div className="mt-1 font-semibold text-muted">Selected entries</div>
            </div>
            <div>
              <div className="font-black text-ink">{formatBytes(selectedSizeBytes)}</div>
              <div className="mt-1 font-semibold text-muted">Selected size</div>
            </div>
            <div>
              <div className="font-black text-ink">{recycleBin ? "On" : "Off"}</div>
              <div className="mt-1 font-semibold text-muted">Recycle Bin</div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/75 px-4 py-3 text-sm font-semibold text-emerald-800">
          Categories: {selectedCategories.length > 0 ? selectedCategories.join(", ") : "None"}. Permanent deletion
          is disabled in this alpha build.
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="h-11 rounded-2xl border border-blue-100 bg-white px-5 text-sm font-black text-slate-600 shadow-soft transition hover:bg-blue-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 px-5 text-sm font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:from-blue-500 hover:to-blue-600"
          >
            <Sparkles className="h-4 w-4" />
            Clean selected
          </button>
        </div>
      </div>
    </div>
  );
}

function TempSummaryCard({
  icon,
  title,
  value,
  accent,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  accent: Accent;
}) {
  return (
    <GlassCard className="flex min-h-[96px] items-center gap-4 p-4">
      <IconBubble icon={icon} accent={accent} size="md" />
      <div className="min-w-0">
        <div className="text-sm font-extrabold text-muted">{title}</div>
        <div className="mt-1 text-[1.45rem] font-black tracking-tight text-ink">{value}</div>
        <button className="mt-1.5 text-sm font-bold text-blue-600 hover:text-blue-700">
          View details &gt;
        </button>
      </div>
    </GlassCard>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: CleanupFilter;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "h-9 rounded-full px-4 text-sm font-bold shadow-soft transition",
        active
          ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200"
          : "border border-blue-100 bg-white/70 text-slate-600 hover:bg-blue-50 hover:text-blue-700",
      )}
    >
      {label}
    </button>
  );
}

function CleanupTable({
  items,
  allVisibleSelected,
  someVisibleSelected,
  scanStatus,
  busy,
  onPreview,
  onToggleAll,
  onToggleItem,
}: {
  items: CleanupItem[];
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  scanStatus: ScanStatus;
  busy: boolean;
  onPreview: () => void;
  onToggleAll: () => void;
  onToggleItem: (id: string, selected: boolean) => void;
}) {
  const hasSelectableItems = items.some((item) => !item.protected);

  return (
    <div className="overflow-hidden rounded-3xl border border-blue-100/85 bg-white/55">
      <div className="grid grid-cols-[38px_minmax(250px,1.55fr)_136px_88px_76px_minmax(210px,1fr)_36px] items-center border-b border-blue-100/80 bg-blue-50/45 px-3 py-1.5 text-sm font-black text-slate-600">
        <CleanupCheckbox
          checked={allVisibleSelected}
          mixed={!allVisibleSelected && someVisibleSelected}
          disabled={!hasSelectableItems || busy}
          ariaLabel="Select visible cleanup items"
          onChange={() => onToggleAll()}
        />
        <span>Name</span>
        <span>Category</span>
        <span>Size</span>
        <span>Items</span>
        <span>Path</span>
        <span />
      </div>
      <div className="divide-y divide-blue-100/70">
        {scanStatus === "idle" ? (
          <CleanupEmptyState
            title="No scan has been started yet."
            description="Preview approved temporary locations before selecting anything for cleanup."
            buttonLabel="Preview temp files"
            onClick={onPreview}
          />
        ) : scanStatus === "scanning" ? (
          <div className="grid min-h-[260px] place-items-center px-5 py-10 text-center text-sm font-semibold text-muted">
            <span>
              <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-600" />
              Scanning approved temporary locations...
            </span>
          </div>
        ) : items.length === 0 ? (
          <CleanupEmptyState
            title="No safe temporary files found."
            description="CleanStart only scans approved temporary and cache locations."
            buttonLabel="Scan again"
            onClick={onPreview}
          />
        ) : (
          items.map((item) => (
            <CleanupRow key={item.id} item={item} busy={busy} onToggle={(selected) => onToggleItem(item.id, selected)} />
          ))
        )}
      </div>
    </div>
  );
}

function CleanupEmptyState({
  title,
  description,
  buttonLabel,
  onClick,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="grid min-h-[260px] place-items-center px-5 py-10 text-center">
      <div>
        <IconBubble icon={Droplets} accent="blue" size="lg" />
        <h3 className="mt-4 text-lg font-black text-ink">{title}</h3>
        <p className="mt-2 max-w-md text-sm font-semibold text-muted">{description}</p>
        <button
          onClick={onClick}
          className="mt-4 h-11 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 px-5 text-sm font-black text-white shadow-soft transition hover:-translate-y-0.5"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

function CleanupCheckbox({
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
        "group relative grid h-[18px] w-[18px] place-items-center",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="absolute inset-0 z-10 h-full w-full cursor-inherit opacity-0"
        aria-label={ariaLabel}
      />
      <span
        className={clsx(
          "pointer-events-none grid h-[18px] w-[18px] place-items-center rounded-md border transition-all duration-150",
          "shadow-[0_2px_5px_rgba(30,64,175,0.10)]",
          active
            ? "border-blue-500 bg-gradient-to-br from-blue-400 to-blue-700 text-white"
            : "border-slate-300 bg-white/75 text-transparent group-hover:border-blue-300 group-hover:bg-blue-50",
          disabled &&
            "border-slate-200 bg-slate-50 text-slate-300 shadow-none group-hover:border-slate-200 group-hover:bg-slate-50",
        )}
        aria-hidden="true"
      >
        {checked ? (
          <Check className="h-3.5 w-3.5 stroke-[3]" />
        ) : mixed ? (
          <span className="h-0.5 w-2.5 rounded-full bg-white" />
        ) : null}
      </span>
    </label>
  );
}

function CleanupRow({
  item,
  busy,
  onToggle,
}: {
  item: CleanupItem;
  busy: boolean;
  onToggle: (selected: boolean) => void;
}) {
  const Icon = categoryIcon(item.category);
  const accent = categoryAccent(item.category);
  return (
    <div
      className={clsx(
        "grid min-h-[44px] grid-cols-[38px_minmax(250px,1.55fr)_136px_88px_76px_minmax(210px,1fr)_36px] items-center px-3 py-0.5 text-sm transition hover:bg-blue-50/45",
        item.protected && "text-slate-500",
        item.status === "failed" && "bg-rose-50/45",
        item.status === "skipped" && "bg-amber-50/45",
      )}
    >
      <CleanupCheckbox
        checked={item.selected}
        disabled={busy || item.protected || !item.cleanable}
        ariaLabel={`Select ${item.name}`}
        onChange={onToggle}
      />
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={clsx(
            "grid h-7 w-7 shrink-0 place-items-center rounded-2xl bg-gradient-to-br shadow-soft",
            accent === "blue" && "from-blue-50 to-sky-100 text-blue-600",
            accent === "green" && "from-emerald-50 to-green-100 text-emerald-600",
            accent === "purple" && "from-violet-50 to-purple-100 text-violet-600",
            accent === "orange" && "from-orange-50 to-amber-100 text-orange-500",
            accent === "slate" && "from-slate-50 to-blue-50 text-slate-500",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-black text-ink">{item.name}</div>
          <div className="truncate text-[11px] font-semibold text-muted">
            {item.statusMessage ?? item.skipReason ?? item.warning ?? item.description}
          </div>
        </div>
      </div>
      <CategoryPill category={item.category} />
      <span className="font-bold text-ink">{formatBytes(item.sizeBytes)}</span>
      <span className="font-semibold text-muted">{item.itemsCount}</span>
      <span className="truncate font-mono text-xs font-semibold text-slate-500">{item.displayPath || item.path}</span>
      <button
        aria-label={`Open details menu for ${item.name}`}
        className="grid h-7 w-7 place-items-center rounded-xl text-slate-500 transition hover:bg-white hover:text-blue-700"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

function CategoryPill({ category }: { category: CleanupItem["category"] }) {
  const tone = {
    Windows: "bg-blue-50 text-blue-700 ring-blue-100",
    Browsers: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    Applications: "bg-violet-50 text-violet-700 ring-violet-100",
    System: "bg-orange-50 text-orange-700 ring-orange-100",
    Other: "bg-slate-50 text-slate-700 ring-slate-100",
  }[category];

  return <span className={clsx("w-fit rounded-xl px-2.5 py-0.5 text-[11px] font-black ring-1", tone)}>{category}</span>;
}

function SelectionSummary({
  selectedBytes,
  skippedBytes,
  totalBytes,
}: {
  selectedBytes: number;
  skippedBytes: number;
  totalBytes: number;
}) {
  const selectedPercent = totalBytes > 0 ? Math.min(Math.max((selectedBytes / totalBytes) * 100, 0), 100) : 0;
  const skippedPercent = totalBytes > 0 ? 100 - selectedPercent : 0;
  return (
    <GlassCard className="p-3.5">
      <h2 className="text-lg font-black text-ink">Selection summary</h2>
      <div className="mt-3 flex justify-center">
        <div
          className="grid h-32 w-32 place-items-center rounded-full shadow-soft"
          style={{
            background: `conic-gradient(#3b82f6 0 ${selectedPercent}%, #d7e3f4 ${selectedPercent}% 100%)`,
          }}
        >
          <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-white/90 text-center shadow-soft">
            <span>
              <span className="block text-lg font-black text-ink">{formatBytes(selectedBytes)}</span>
              <span className="block text-xs font-semibold text-muted">Selected</span>
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-2 text-sm font-bold">
        <SummaryLine label="Selected" value={`${formatBytes(selectedBytes)} (${selectedPercent.toFixed(1)}%)`} tone="blue" />
        <SummaryLine label="Skipped" value={`${formatBytes(skippedBytes)} (${skippedPercent.toFixed(1)}%)`} tone="slate" />
        <div className="border-t border-blue-100 pt-2.5">
          <SummaryLine label="Total size" value={formatBytes(totalBytes)} tone="none" />
        </div>
      </div>
    </GlassCard>
  );
}

function SummaryLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "slate" | "none";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted">
        {tone !== "none" && (
          <span className={clsx("h-2.5 w-2.5 rounded-full", tone === "blue" ? "bg-blue-500" : "bg-slate-300")} />
        )}
        {label}
      </span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

function SafetyCard() {
  const safetyItems = [
    "Only temporary and safe files are shown.",
    "No personal files are affected.",
    "Browser cleanup targets cache only, not cookies, passwords, history, or sessions.",
    "System performance will not be impacted.",
    "You're in control - review before cleaning.",
  ];
  return (
    <GlassCard className="p-3.5">
      <div className="mb-2.5 flex items-center gap-3">
        <IconBubble icon={ShieldCheck} accent="green" size="sm" />
        <h2 className="text-lg font-black text-ink">Safety first</h2>
      </div>
      <div className="space-y-2">
        {safetyItems.map((item) => (
          <p key={item} className="flex gap-2 text-[13px] font-semibold text-muted">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{item}</span>
          </p>
        ))}
      </div>
      <button className="mt-3 text-sm font-black text-blue-600 hover:text-blue-700">
        Learn more about safety &gt;
      </button>
    </GlassCard>
  );
}

function ActionButton({
  icon,
  title,
  subtitle,
  onClick,
  disabled = false,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = icon;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex min-h-[54px] min-w-[242px] items-center gap-3 rounded-2xl border border-blue-100 bg-white/75 px-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0",
      )}
    >
      <Icon className="h-6 w-6 shrink-0 text-blue-600" />
      <span>
        <span className="block text-base font-black text-blue-700">{title}</span>
        <span className="block text-xs font-semibold text-muted">{subtitle}</span>
      </span>
    </button>
  );
}

function StartupAnalyzerScreen({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (value: string) => void;
}) {
  const filtered = useMemo(
    () => startupEntries.filter((entry) => entry.name.toLowerCase().includes(search.toLowerCase())),
    [search],
  );
  const toneForImpact = (impact: StartupEntry["impact"]) => {
    if (impact === "Normal") return "green" as const;
    if (impact === "Potentially unnecessary") return "orange" as const;
    return "slate" as const;
  };

  return (
    <ScreenLayout>
      <PageHeader title="Startup Analyzer" subtitle={screenCopy.startup}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search startup entries" />
      </PageHeader>
      <div className="grid grid-cols-[1fr_340px] gap-5">
        <GlassCard className="p-5">
          <Table
            headers={["Name", "Status", "Source", "Advisor label", "Path"]}
            rows={filtered.map((entry) => [
              <strong key={`${entry.name}-name`} className="text-ink">
                {entry.name}
              </strong>,
              <StatusBadge key={`${entry.name}-status`} label={entry.status} tone={entry.status === "Enabled" ? "blue" : "slate"} />,
              entry.source,
              <StatusBadge key={`${entry.name}-impact`} label={entry.impact} tone={toneForImpact(entry.impact)} />,
              <span key={`${entry.name}-path`} className="font-mono text-xs text-slate-600">
                {entry.path}
              </span>,
            ])}
          />
        </GlassCard>
        <InspectorPanel title="Read-only advisor">
          <SafetyBanner compact>
            <span>This prototype does not disable, delete, or quarantine startup entries.</span>
          </SafetyBanner>
          <p>Labels are informational and do not claim malware detection.</p>
          <p>Normal: common or expected. Unknown: needs user review. Potentially unnecessary: may be optional.</p>
        </InspectorPanel>
      </div>
    </ScreenLayout>
  );
}

function DiskAnalyzerScreen() {
  return (
    <ScreenLayout>
      <PageHeader title="Disk Analyzer" subtitle={screenCopy.disk}>
        <div className="flex gap-3">
          <Button accent="orange">Scan profile folders</Button>
          <Button variant="secondary">Choose folder</Button>
        </div>
      </PageHeader>
      <div className="grid grid-cols-[1fr_340px] gap-5">
        <div className="space-y-5">
          <GlassCard className="p-5">
            <h2 className="mb-4 text-xl font-black text-ink">Storage breakdown</h2>
            <div className="grid grid-cols-4 gap-3">
              {storageBreakdown.map((item) => (
                <div key={item.label} className="rounded-3xl border border-blue-100 bg-white/65 p-4 shadow-soft">
                  <div className={`mb-4 h-24 rounded-2xl ${item.color} opacity-85`} />
                  <div className="text-2xl font-black text-ink">{item.value}</div>
                  <div className="text-sm font-semibold text-muted">{item.label}</div>
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard className="p-5">
            <Table
              headers={["Type", "Name", "Size", "Path"]}
              rows={diskItems.map((item) => [
                item.type,
                <strong key={`${item.name}-name`} className="text-ink">
                  {item.name}
                </strong>,
                item.size,
                <span key={`${item.name}-path`} className="font-mono text-xs text-slate-600">
                  {item.path}
                </span>,
              ])}
            />
          </GlassCard>
        </div>
        <InspectorPanel title="Scope inspector">
          <p>Default scope: user profile folders only.</p>
          <p>The real backend must avoid aggressive whole-system scans by default.</p>
          <SafetyBanner compact>
            <span>Access-denied folders should be skipped and logged.</span>
          </SafetyBanner>
        </InspectorPanel>
      </div>
    </ScreenLayout>
  );
}

function ActivityLogScreen({
  logFilter,
  setLogFilter,
}: {
  logFilter: string;
  setLogFilter: (value: string) => void;
}) {
  const filters = ["All", "Scans", "Cleanup", "Warnings"];
  return (
    <ScreenLayout>
      <PageHeader title="Activity Log" subtitle={screenCopy.activity}>
        <div className="flex gap-3">
          <Button variant="secondary">
            <ClipboardCopy className="mr-2 h-4 w-4" />
            Copy log
          </Button>
          <Button variant="secondary">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear visible log
          </Button>
        </div>
      </PageHeader>
      <div className="grid grid-cols-[1fr_340px] gap-5">
        <GlassCard className="p-5">
          <div className="mb-4 flex gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setLogFilter(filter)}
                className={`rounded-full px-4 py-2 text-sm font-semibold shadow-soft transition ${
                  logFilter === filter ? "bg-blue-600 text-white" : "border border-blue-100 bg-white/75 text-blue-700"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl border border-blue-100/80 bg-white/50">
            {activityEvents.map((event) => (
              <ActivityRow key={`${event.title}-activity`} event={event} />
            ))}
          </div>
        </GlassCard>
        <InspectorPanel title="Scan history">
          <p>5 visible mock events.</p>
          <p>Logs remain local only. This prototype does not send data anywhere.</p>
          <StatusBadge label="Local only" tone="green" />
        </InspectorPanel>
      </div>
    </ScreenLayout>
  );
}

function SettingsScreen({
  recycleBin,
  setRecycleBin,
}: {
  recycleBin: boolean;
  setRecycleBin: (checked: boolean) => void;
}) {
  return (
    <ScreenLayout>
      <PageHeader title="Settings" subtitle={screenCopy.settings} />
      <div className="grid grid-cols-[1fr_340px] gap-5">
        <GlassCard className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <SettingBlock icon={Languages} title="Language" value="English" />
            <SettingBlock icon={ShieldCheck} title="Safety mode" value="Preview first" />
            <SettingBlock icon={Lock} title="Privacy" value="No telemetry" />
            <SettingBlock icon={Info} title="Version" value="CleanStart v0.2.0 prototype" />
          </div>
          <div className="mt-5 rounded-3xl border border-blue-100 bg-white/65 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-ink">Recycle Bin behavior</h3>
                <p className="text-sm font-medium text-muted">Move to Recycle Bin when supported.</p>
              </div>
              <Toggle checked={recycleBin} onChange={setRecycleBin} label="Recycle Bin behavior" />
            </div>
          </div>
        </GlassCard>
        <InspectorPanel title="Safety principles">
          {appPrinciples.map((principle) => (
            <p key={principle} className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{principle}</span>
            </p>
          ))}
          <div className="mt-4 border-t border-blue-100 pt-4">
            {settingRows.map(([label, value]) => (
              <div key={label} className="mb-2">
                <div className="text-xs font-bold uppercase text-slate-400">{label}</div>
                <div className="font-semibold text-ink">{value}</div>
              </div>
            ))}
          </div>
        </InspectorPanel>
      </div>
    </ScreenLayout>
  );
}

function ScreenLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-none">{children}</div>;
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <GlassCard className="flex items-center gap-4 p-5">
      <IconBubble icon={icon} accent="blue" size="md" />
      <div>
        <div className="text-2xl font-black text-ink">{value}</div>
        <div className="text-sm font-semibold text-muted">{label}</div>
      </div>
    </GlassCard>
  );
}

function SettingBlock({
  icon,
  title,
  value,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-blue-100 bg-white/65 p-5 shadow-soft">
      <IconBubble icon={icon} accent="blue" size="sm" />
      <h3 className="mt-4 text-lg font-black text-ink">{title}</h3>
      <p className="mt-1 text-sm font-semibold text-muted">{value}</p>
    </div>
  );
}

export default App;
