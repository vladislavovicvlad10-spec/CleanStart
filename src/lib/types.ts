// Shared types mirroring the Rust backend IPC contracts.

export type ScreenId =
  | "dashboard"
  | "temp"
  | "startup"
  | "disk"
  | "activity"
  | "settings";

/* Temp Cleaner ----------------------------------------------------------- */

export type CleanupCategory =
  | "Windows"
  | "Browsers"
  | "Applications"
  | "System"
  | "Other";

export interface CleanupItem {
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
  skipReason?: string | null;
  warning?: string | null;
  lastModified?: string | null;
}

export interface CleanupScanResult {
  scannedCount: number;
  totalSizeBytes: number;
  cleanableCount: number;
  protectedCount: number;
  warnings: string[];
  errors: string[];
  items: CleanupItem[];
}

export interface CleanupOutcomeItem {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  reason?: string | null;
}

export interface DryRunResult {
  selectedCount: number;
  selectedSizeBytes: number;
  cleanableCount: number;
  skippedCount: number;
  warnings: string[];
  skippedItems: CleanupOutcomeItem[];
}

export interface CleanResult {
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
}

/* Startup Analyzer -------------------------------------------------------- */

export type StartupLocation =
  | "runKeyCurrentUser"
  | "runKeyLocalMachine"
  | "runKeyLocalMachine32"
  | "startupFolderUser"
  | "startupFolderCommon";

export interface StartupEntry {
  id: string;
  name: string;
  displayName: string;
  command: string;
  location: StartupLocation;
  source: string;
  enabled: boolean;
  canToggle: boolean;
  note?: string | null;
}

export interface StartupScanResult {
  entries: StartupEntry[];
  warnings: string[];
}

/* Disk Analyzer ----------------------------------------------------------- */

export interface FolderUsage {
  name: string;
  displayPath: string;
  sizeBytes: number;
  fileCount: number;
  skippedCount: number;
}

export interface LargeFile {
  name: string;
  displayPath: string;
  sizeBytes: number;
  modifiedMs?: number | null;
}

export interface DriveStats {
  totalBytes: number;
  freeBytes: number;
}

export interface DiskScanResult {
  folders: FolderUsage[];
  largestFiles: LargeFile[];
  totalBytes: number;
  scannedFiles: number;
  durationMs: number;
  truncated: boolean;
  warnings: string[];
  drive?: DriveStats | null;
}

/* Activity history --------------------------------------------------------- */

export type ActivityKind =
  | "scan"
  | "cleanup"
  | "startup"
  | "disk"
  | "settings"
  | "app";

export type ActivityStatus = "info" | "success" | "warning" | "error";

export interface ActivityEntry {
  id: string;
  timestampMs: number;
  kind: ActivityKind;
  title: string;
  detail: string;
  status: ActivityStatus;
  bytesFreed?: number | null;
}

/* Settings ----------------------------------------------------------------- */

export type ThemeId = "dark" | "light";

export interface AppSettings {
  moveToRecycleBin: boolean;
  theme: ThemeId;
  launchAtStartup: boolean;
}

export interface ApprovedLocation {
  name: string;
  description: string;
  displayPath: string;
  exists: boolean;
  cleanable: boolean;
  protected: boolean;
}
