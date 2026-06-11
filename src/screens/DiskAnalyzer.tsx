import {
  AlertTriangle,
  Database,
  Eye,
  FileText,
  Folder,
  HardDrive,
  RefreshCw,
  Timer,
} from "lucide-react";
import { useMemo, useState } from "react";
import { api, friendlyError, recordActivity } from "../lib/ipc";
import { formatBytes, formatCount, formatRelative } from "../lib/format";
import type { DiskScanResult } from "../lib/types";
import {
  Button,
  Card,
  EmptyState,
  Notice,
  Pill,
  ProgressBar,
  StatTile,
} from "../components/ui";
import { useToast } from "../state/ToastContext";

type Status = "idle" | "scanning" | "ready" | "error";

const VISIBLE_FILES = 15;

export function DiskAnalyzerScreen() {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<DiskScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAllFiles, setShowAllFiles] = useState(false);

  const runScan = async () => {
    setStatus("scanning");
    setErrorMessage(null);
    setShowAllFiles(false);
    try {
      const scan = await api.scanDiskUsage();
      setResult(scan);
      setStatus("ready");
      recordActivity(
        "disk",
        "Disk analysis completed",
        `${formatCount(scan.scannedFiles, "file")} reviewed across profile folders · ${formatBytes(scan.totalBytes)} measured. Read-only, nothing was changed.`,
        scan.warnings.length > 0 ? "warning" : "success",
      );
      toast({
        tone: "success",
        title: "Disk analysis completed — read-only.",
        details: [
          `${formatBytes(scan.totalBytes)} measured across ${scan.folders.length} folders`,
          `${formatCount(scan.scannedFiles, "file")} reviewed in ${(scan.durationMs / 1000).toFixed(1)}s`,
        ],
      });
    } catch (error) {
      setStatus("error");
      setErrorMessage(friendlyError(error));
    }
  };

  const driveUsedPercent = useMemo(() => {
    if (!result?.drive || result.drive.totalBytes === 0) return null;
    return ((result.drive.totalBytes - result.drive.freeBytes) / result.drive.totalBytes) * 100;
  }, [result]);

  const maxFolderSize = useMemo(
    () => Math.max(1, ...(result?.folders.map((folder) => folder.sizeBytes) ?? [1])),
    [result],
  );

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-4">
      <section className="grid grid-cols-4 gap-4">
        <StatTile
          icon={Database}
          tone="accent"
          label="Measured in profile folders"
          value={status === "ready" && result ? formatBytes(result.totalBytes) : "—"}
          delay={0}
        />
        <StatTile
          icon={FileText}
          tone="neutral"
          label="Files reviewed"
          value={status === "ready" && result ? result.scannedFiles.toLocaleString() : "—"}
          delay={40}
        />
        <StatTile
          icon={HardDrive}
          tone="success"
          label="Drive free space"
          value={status === "ready" && result?.drive ? formatBytes(result.drive.freeBytes) : "—"}
          sub={
            status === "ready" && result?.drive
              ? `of ${formatBytes(result.drive.totalBytes)}`
              : undefined
          }
          delay={80}
        />
        <StatTile
          icon={Timer}
          tone="warning"
          label="Scan duration"
          value={status === "ready" && result ? `${(result.durationMs / 1000).toFixed(1)}s` : "—"}
          delay={120}
        />
      </section>

      <Card className="animate-rise overflow-hidden" style={{ animationDelay: "140ms" }}>
        <div className="flex items-center justify-between gap-3 border-b border-edge/10 px-4 py-3">
          <div className="flex items-center gap-2.5 text-[13px] font-medium text-muted">
            <Eye className="h-4 w-4 text-accent" />
            Strictly read-only — nothing can be deleted from this screen.
          </div>
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={runScan}
            disabled={status === "scanning"}
            busy={status === "scanning"}
          >
            {status === "idle" ? "Analyze" : "Rescan"}
          </Button>
        </div>

        {status === "scanning" && <ProgressBar indeterminate className="rounded-none" />}

        {status === "idle" ? (
          <EmptyState
            icon={HardDrive}
            title="See where your space goes"
            description="CleanStart measures your user-profile folders (Documents, Downloads, AppData and friends) and shows the largest files. It only reads — it never deletes from here."
            action={
              <Button size="lg" icon={HardDrive} onClick={runScan}>
                Analyze my folders
              </Button>
            }
          />
        ) : status === "scanning" ? (
          <div className="grid min-h-[280px] place-items-center text-sm font-medium text-muted">
            Measuring profile folders… large folders can take a moment.
          </div>
        ) : status === "error" ? (
          <EmptyState
            icon={AlertTriangle}
            title="Disk analysis is unavailable"
            description={errorMessage ?? "The disk scan could not be completed."}
            action={
              <Button variant="secondary" icon={RefreshCw} onClick={runScan}>
                Try again
              </Button>
            }
          />
        ) : result && result.folders.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="No profile folders found"
            description="None of the standard user-profile folders could be located on this system."
          />
        ) : (
          result && (
            <div className="space-y-1 p-4">
              {driveUsedPercent !== null && result.drive && (
                <div className="mb-4 rounded-xl bg-surface-2 p-4 ring-1 ring-edge/10">
                  <div className="flex items-center justify-between text-[13px] font-semibold">
                    <span className="text-ink">System drive</span>
                    <span className="text-muted">
                      {formatBytes(result.drive.totalBytes - result.drive.freeBytes)} used ·{" "}
                      {formatBytes(result.drive.freeBytes)} free
                    </span>
                  </div>
                  <ProgressBar value={driveUsedPercent} className="mt-2.5 h-2" />
                </div>
              )}

              {result.truncated && (
                <Notice tone="warning" className="mb-3">
                  Scan limits were reached, so these numbers are a partial (but safe) snapshot.
                </Notice>
              )}

              {result.folders.map((folder, index) => (
                <div key={folder.displayPath} className="group rounded-lg px-2 py-2 hover:bg-surface-2/60">
                  <div className="flex items-center justify-between gap-4 text-[13px]">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Folder className="h-4 w-4 shrink-0 text-accent" />
                      <span className="font-semibold text-ink">{folder.name}</span>
                      <span className="hidden truncate font-mono text-[11px] text-muted md:inline">
                        {folder.displayPath}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-muted">
                        {formatCount(folder.fileCount, "file")}
                      </span>
                      <span className="w-20 text-right font-semibold text-ink">
                        {formatBytes(folder.sizeBytes)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-edge/10">
                    <div
                      className="bar-grow h-full rounded-full bg-accent/80"
                      style={{
                        width: `${Math.max((folder.sizeBytes / maxFolderSize) * 100, 0.5)}%`,
                        transitionDelay: `${index * 40}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </Card>

      {status === "ready" && result && result.largestFiles.length > 0 && (
        <Card className="animate-rise overflow-hidden">
          <div className="flex items-center justify-between border-b border-edge/10 px-4 py-3">
            <h3 className="text-[15px] font-bold text-ink">Largest files</h3>
            <Pill tone="neutral">read-only</Pill>
          </div>
          <div className="divide-y divide-edge/10">
            {(showAllFiles ? result.largestFiles : result.largestFiles.slice(0, VISIBLE_FILES)).map(
              (file) => (
                <div
                  key={file.displayPath}
                  className="grid grid-cols-[minmax(220px,1fr)_110px_110px] items-center gap-3 px-4 py-2 text-[13px] transition-colors hover:bg-surface-2/60"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{file.name}</div>
                    <div className="truncate font-mono text-[11px] text-muted">
                      {file.displayPath}
                    </div>
                  </div>
                  <span className="text-xs text-muted">
                    {file.modifiedMs ? formatRelative(file.modifiedMs) : "—"}
                  </span>
                  <span className="text-right font-semibold text-ink">
                    {formatBytes(file.sizeBytes)}
                  </span>
                </div>
              ),
            )}
          </div>
          {result.largestFiles.length > VISIBLE_FILES && (
            <button
              onClick={() => setShowAllFiles((current) => !current)}
              className="w-full border-t border-edge/10 py-2.5 text-[13px] font-semibold text-accent transition-colors hover:bg-surface-2/60"
            >
              {showAllFiles
                ? "Show fewer"
                : `Show all ${result.largestFiles.length} files`}
            </button>
          )}
        </Card>
      )}

      {status === "ready" && result && result.warnings.length > 0 && (
        <Notice tone="warning" className="animate-rise">
          {result.warnings.join(" ")}
        </Notice>
      )}
    </div>
  );
}
