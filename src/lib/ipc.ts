// Typed IPC client for the Rust backend.
//
// Every call goes through `call`, which fails with a friendly message when
// the UI runs outside the Tauri desktop shell (e.g. plain `vite dev`).

import { invoke } from "@tauri-apps/api/core";
import type {
  ActivityEntry,
  ActivityKind,
  ActivityStatus,
  AppSettings,
  ApprovedLocation,
  CleanResult,
  CleanupItem,
  CleanupScanResult,
  DiskScanResult,
  DryRunResult,
  StartupEntry,
  StartupLocation,
  StartupScanResult,
} from "./types";

export const DESKTOP_ONLY_MESSAGE =
  "This feature needs the CleanStart desktop app. Run it with `npm run dev` or install the Windows build.";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error(DESKTOP_ONLY_MESSAGE);
  }
  return invoke<T>(command, args);
}

export function friendlyError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "The operation could not be completed safely.";
}

export const api = {
  /* Temp Cleaner */
  scanTempPreview: () => call<CleanupScanResult>("scan_temp_preview"),
  dryRunCleanup: (selectedItems: CleanupItem[]) =>
    call<DryRunResult>("dry_run_cleanup", { selectedItems }),
  cleanSelectedItems: (selectedItems: CleanupItem[]) =>
    call<CleanResult>("clean_selected_items", {
      selectedItems,
      // Permanent deletion is disabled by design — Recycle Bin only.
      options: { moveToRecycleBin: true },
    }),

  /* Startup Analyzer */
  scanStartupEntries: () => call<StartupScanResult>("scan_startup_entries"),
  setStartupEntryEnabled: (location: StartupLocation, name: string, enabled: boolean) =>
    call<StartupEntry>("set_startup_entry_enabled", { location, name, enabled }),

  /* Disk Analyzer */
  scanDiskUsage: () => call<DiskScanResult>("scan_disk_usage"),

  /* Activity history */
  getActivityLog: () => call<ActivityEntry[]>("get_activity_log"),
  clearActivityLog: () => call<void>("clear_activity_log"),

  /* Settings */
  getAppSettings: () => call<AppSettings>("get_app_settings"),
  saveAppSettings: (settings: AppSettings) =>
    call<AppSettings>("save_app_settings", { settings }),
  setLaunchAtStartup: (enabled: boolean) =>
    call<boolean>("set_launch_at_startup", { enabled }),
  getApprovedCleanupLocations: () =>
    call<ApprovedLocation[]>("get_approved_cleanup_locations"),
};

/**
 * Fire-and-forget activity logging. Never throws and never blocks the UI.
 */
export function recordActivity(
  kind: ActivityKind,
  title: string,
  detail: string,
  status: ActivityStatus,
  bytesFreed?: number,
): void {
  if (!isTauri()) return;
  void invoke("log_activity", {
    entry: { kind, title, detail, status, bytesFreed: bytesFreed ?? null },
  }).catch(() => undefined);
}
