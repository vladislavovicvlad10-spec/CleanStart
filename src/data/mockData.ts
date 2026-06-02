import {
  Activity,
  Database,
  Droplets,
  FileSearch,
  FolderOpen,
  HardDrive,
  ListChecks,
  Rocket,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type {
  ActivityEvent,
  DiskItem,
  NavItem,
  StartupEntry,
  SummaryCardData,
  TempFileItem,
} from "../types/app";

export const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: ShieldCheck },
  { id: "temp", label: "Temp Cleaner", icon: Droplets },
  { id: "startup", label: "Startup Analyzer", icon: Rocket },
  { id: "disk", label: "Disk Analyzer", icon: HardDrive },
  { id: "activity", label: "Activity Log", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

export const summaryCards: SummaryCardData[] = [
  {
    title: "Temp Cleaner",
    description: "Preview safe temporary files before cleanup.",
    icon: Droplets,
    accent: "blue",
    metrics: [
      { label: "Items found", value: "218" },
      { label: "Preview size", value: "32.6 MB" },
    ],
    actionLabel: "Review now",
  },
  {
    title: "Startup Analyzer",
    description: "Read-only startup entry review.",
    icon: Rocket,
    accent: "purple",
    metrics: [
      { label: "Entries", value: "22" },
      { label: "Changes made", value: "0" },
    ],
    actionLabel: "Analyze startup",
  },
  {
    title: "Disk Analyzer",
    description: "Find large files inside selected folders.",
    icon: HardDrive,
    accent: "orange",
    metrics: [
      { label: "Reviewed", value: "156 GB" },
      { label: "Scope", value: "Profile" },
    ],
    actionLabel: "Analyze disk",
  },
  {
    title: "Activity Log",
    description: "Local record of scans and actions.",
    icon: ListChecks,
    accent: "green",
    metrics: [
      { label: "Last event", value: "11:15 AM" },
      { label: "Storage", value: "Local" },
    ],
    actionLabel: "Open log",
  },
  {
    title: "Settings",
    description: "Privacy, cleanup preferences, and language.",
    icon: Settings,
    accent: "blue",
    metrics: [
      { label: "Language", value: "EN" },
      { label: "Recycle Bin", value: "On" },
    ],
    actionLabel: "Open settings",
  },
];

export const quickActions = [
  { label: "Preview temp files", icon: FileSearch, target: "temp" as const, accent: "blue" as const },
  { label: "Analyze startup", icon: Rocket, target: "startup" as const, accent: "purple" as const },
  { label: "Scan profile folders", icon: FolderOpen, target: "disk" as const, accent: "blue" as const },
  { label: "Open activity log", icon: ListChecks, target: "activity" as const, accent: "green" as const },
];

export const activityEvents: ActivityEvent[] = [
  {
    title: "Temp Cleaner preview completed",
    subtitle: "218 safe temp items reviewed · 32.6 MB",
    time: "11:15 AM",
    kind: "blue",
  },
  {
    title: "Startup Analyzer scan completed",
    subtitle: "22 entries found · no changes made",
    time: "11:13 AM",
    kind: "purple",
  },
  {
    title: "Disk Analyzer scan completed",
    subtitle: "Profile folders reviewed · largest items listed",
    time: "11:09 AM",
    kind: "orange",
  },
  {
    title: "Activity Log opened",
    subtitle: "Local-only history viewed",
    time: "11:05 AM",
    kind: "green",
  },
  {
    title: "CleanStart started",
    subtitle: "v0.2.0 prototype · no automatic scan",
    time: "10:58 AM",
    kind: "blue",
  },
];

export const tempFiles: TempFileItem[] = [
  {
    id: "1",
    category: "User temp",
    type: "File",
    size: "8.4 MB",
    path: "%TEMP%\\cleanstart-demo-cache.tmp",
    selected: true,
  },
  {
    id: "2",
    category: "Browser cache",
    type: "Folder",
    size: "14.9 MB",
    path: "%LOCALAPPDATA%\\DemoBrowser\\Cache",
    selected: true,
  },
  {
    id: "3",
    category: "Installer leftovers",
    type: "File",
    size: "5.1 MB",
    path: "%LOCALAPPDATA%\\Temp\\demo-installer.log",
    selected: false,
  },
  {
    id: "4",
    category: "Thumbnail cache",
    type: "File",
    size: "4.2 MB",
    path: "%LOCALAPPDATA%\\Microsoft\\Windows\\Explorer\\thumbcache_demo.db",
    selected: false,
  },
];

export const startupEntries: StartupEntry[] = [
  {
    name: "OneDrive",
    source: "Run key",
    path: "%LOCALAPPDATA%\\Microsoft\\OneDrive\\OneDrive.exe",
    status: "Enabled",
    impact: "Normal",
  },
  {
    name: "Updater Helper",
    source: "Startup folder",
    path: "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\updater.lnk",
    status: "Enabled",
    impact: "Unknown",
  },
  {
    name: "Demo Tray Tool",
    source: "Run key",
    path: "C:\\Program Files\\DemoTool\\tray.exe",
    status: "Enabled",
    impact: "Potentially unnecessary",
  },
  {
    name: "Security Notifications",
    source: "System entry",
    path: "C:\\Windows\\System32\\SecurityHealthSystray.exe",
    status: "Enabled",
    impact: "Normal",
  },
];

export const diskItems: DiskItem[] = [
  {
    type: "Folder",
    name: "Videos",
    size: "48.2 GB",
    path: "%USERPROFILE%\\Videos",
  },
  {
    type: "Folder",
    name: "Downloads",
    size: "31.7 GB",
    path: "%USERPROFILE%\\Downloads",
  },
  {
    type: "File",
    name: "demo-archive.zip",
    size: "8.6 GB",
    path: "%USERPROFILE%\\Downloads\\demo-archive.zip",
  },
  {
    type: "Folder",
    name: "Screenshots",
    size: "5.4 GB",
    path: "%USERPROFILE%\\Pictures\\Screenshots",
  },
];

export const storageBreakdown = [
  { label: "Media", value: "44%", color: "bg-blue-500" },
  { label: "Downloads", value: "27%", color: "bg-orange-500" },
  { label: "Documents", value: "18%", color: "bg-emerald-500" },
  { label: "Other", value: "11%", color: "bg-slate-400" },
];

export const settingRows = [
  ["Language", "English"],
  ["Recycle Bin behavior", "Move to Recycle Bin when supported"],
  ["Privacy", "Local only · no telemetry"],
  ["Prototype state", "Mock data only · no cleanup backend connected"],
];

export const appPrinciples = [
  "Preview first, confirm always.",
  "No automatic cleanup on startup.",
  "No antivirus or malware claims.",
  "No telemetry, login, cloud sync, or external data collection.",
];

export const screenCopy = {
  dashboard: "Safety-first Windows maintenance tool",
  temp: "Mock preview of safe temporary cleanup categories.",
  startup: "Read-only advisory view. No startup item can be disabled from this prototype.",
  disk: "Focused folder review with mock storage breakdown.",
  activity: "Local-only activity history mockup.",
  settings: "Prototype preferences and safety principles.",
};

export { Database };
