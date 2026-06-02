import type { LucideIcon } from "lucide-react";

export type ScreenId =
  | "dashboard"
  | "temp"
  | "startup"
  | "disk"
  | "activity"
  | "settings";

export type Accent = "blue" | "purple" | "orange" | "green" | "slate";

export interface NavItem {
  id: ScreenId;
  label: string;
  icon: LucideIcon;
}

export interface SummaryMetric {
  label: string;
  value: string;
}

export interface SummaryCardData {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: Accent;
  metrics: SummaryMetric[];
  actionLabel: string;
}

export interface ActivityEvent {
  title: string;
  subtitle: string;
  time: string;
  kind: Accent;
}

export interface TempFileItem {
  id: string;
  category: string;
  type: "File" | "Folder";
  size: string;
  path: string;
  selected: boolean;
}

export interface StartupEntry {
  name: string;
  source: string;
  path: string;
  status: "Enabled" | "Disabled";
  impact: "Normal" | "Unknown" | "Potentially unnecessary";
}

export interface DiskItem {
  type: "Folder" | "File";
  name: string;
  size: string;
  path: string;
}
