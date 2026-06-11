import clsx from "clsx";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Activity,
  Droplets,
  HardDrive,
  LayoutDashboard,
  Lock,
  Maximize2,
  Minus,
  Rocket,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { isTauri } from "../lib/ipc";
import type { ScreenId } from "../lib/types";

interface NavEntry {
  id: ScreenId;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  heading: string | null;
  items: NavEntry[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    heading: null,
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    heading: "Tools",
    items: [
      { id: "temp", label: "Temp Cleaner", icon: Droplets },
      { id: "startup", label: "Startup Analyzer", icon: Rocket },
      { id: "disk", label: "Disk Analyzer", icon: HardDrive },
    ],
  },
  {
    heading: "System",
    items: [
      { id: "activity", label: "Activity Log", icon: Activity },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

const SCREEN_TITLES: Record<ScreenId, string> = {
  dashboard: "Dashboard",
  temp: "Temp Cleaner",
  startup: "Startup Analyzer",
  disk: "Disk Analyzer",
  activity: "Activity Log",
  settings: "Settings",
};

export function Shell({
  activeScreen,
  onNavigate,
  children,
}: {
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-app text-ink">
      <Sidebar activeScreen={activeScreen} onNavigate={onNavigate} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TitleBar screenTitle={SCREEN_TITLES[activeScreen]} />
        <main
          key={activeScreen}
          className="clean-scrollbar animate-rise min-h-0 flex-1 overflow-y-auto px-7 pb-6 pt-4"
        >
          {children}
        </main>
        <StatusBar />
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id="cs-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <path
        d="M20 3 L34 8.5 V19 C34 28 28 34.5 20 37 C12 34.5 6 28 6 19 V8.5 Z"
        fill="url(#cs-logo)"
        opacity="0.18"
      />
      <path
        d="M20 3 L34 8.5 V19 C34 28 28 34.5 20 37 C12 34.5 6 28 6 19 V8.5 Z"
        fill="none"
        stroke="url(#cs-logo)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 19.5 L18 24 L27 14.5"
        fill="none"
        stroke="#2dd4bf"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Sidebar({
  activeScreen,
  onNavigate,
}: {
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}) {
  return (
    <aside className="flex w-[228px] shrink-0 flex-col border-r border-edge/10 bg-surface">
      <div className="flex items-center gap-3 px-5 pb-5 pt-5" data-tauri-drag-region>
        <LogoMark />
        <div className="pointer-events-none">
          <div className="text-[15px] font-bold leading-tight tracking-tight text-ink">
            CleanStart
          </div>
          <div className="text-[11px] font-medium text-muted">v1.0.0</div>
        </div>
      </div>

      <nav className="clean-scrollbar flex-1 overflow-y-auto px-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.heading ?? "root"} className="mb-1">
            {section.heading && (
              <div className="px-3 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-muted/60">
                {section.heading}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeScreen;
              return (
                <button
                  key={item.id}
                  data-testid={`nav-${item.id}`}
                  onClick={() => onNavigate(item.id)}
                  className={clsx(
                    "group relative mb-0.5 flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition-all duration-150",
                    active
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:bg-edge/10 hover:text-ink",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-accent" />
                  )}
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-edge/10 p-4">
        <div className="rounded-xl bg-success/10 p-3 ring-1 ring-success/15">
          <div className="flex items-center gap-2 text-xs font-bold text-success">
            <ShieldCheck className="h-4 w-4" />
            Safe by design
          </div>
          <p className="mt-1.5 text-[11px] leading-4 text-muted">
            Preview-first. Recycle Bin only. Everything stays on this PC.
          </p>
        </div>
      </div>
    </aside>
  );
}

function TitleBar({ screenTitle }: { screenTitle: string }) {
  return (
    <header
      className="flex h-12 shrink-0 items-center justify-between border-b border-edge/10 pl-7"
      data-tauri-drag-region
    >
      <div className="pointer-events-none flex items-baseline gap-2.5">
        <h1 className="text-[15px] font-bold tracking-tight text-ink">{screenTitle}</h1>
      </div>
      <WindowControls />
    </header>
  );
}

function WindowControls() {
  if (!isTauri()) {
    return <div className="w-3" />;
  }

  const controls = [
    {
      label: "Minimize window",
      icon: Minus,
      onClick: () => void getCurrentWindow().minimize(),
      className: "hover:bg-edge/10 hover:text-ink",
    },
    {
      label: "Maximize or restore window",
      icon: Maximize2,
      onClick: () => void getCurrentWindow().toggleMaximize(),
      className: "hover:bg-edge/10 hover:text-ink",
    },
    {
      label: "Close window",
      icon: X,
      onClick: () => void getCurrentWindow().close(),
      className: "hover:bg-danger hover:text-white",
    },
  ];

  return (
    <div className="flex h-full items-stretch">
      {controls.map((control) => {
        const Icon = control.icon;
        return (
          <button
            key={control.label}
            aria-label={control.label}
            data-testid={control.label.toLowerCase().replace(/\s+/g, "-")}
            onClick={control.onClick}
            className={clsx(
              "grid w-12 place-items-center text-muted transition-colors duration-100",
              control.className,
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

function StatusBar() {
  return (
    <footer className="flex h-9 shrink-0 items-center justify-between border-t border-edge/10 bg-surface px-7 text-[11px] font-medium text-muted">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        <span>Preview-first · Recycle Bin only · Permanent deletion disabled</span>
      </div>
      <div className="flex items-center gap-2">
        <Lock className="h-3.5 w-3.5" />
        <span>Local-only — no telemetry, no account, no cloud</span>
      </div>
    </footer>
  );
}
