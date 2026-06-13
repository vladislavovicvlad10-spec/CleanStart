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
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { isTauri } from "../lib/ipc";
import type { ScreenId } from "../lib/types";
import type { Tone } from "./ui";

interface NavEntry {
  id: ScreenId;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavEntry[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "temp", label: "Temp Cleaner", icon: Droplets },
  { id: "startup", label: "Startup Analyzer", icon: Rocket },
  { id: "disk", label: "Disk Analyzer", icon: HardDrive },
  { id: "activity", label: "Activity Log", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

interface PageHeading {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone: Tone;
}

/** Dashboard renders its own hero; every other screen gets this heading. */
const PAGE_HEADINGS: Partial<Record<ScreenId, PageHeading>> = {
  temp: {
    title: "Temp Cleaner",
    subtitle: "Preview safe temporary files, then move them to the Recycle Bin.",
    icon: Droplets,
    tone: "accent",
  },
  startup: {
    title: "Startup Analyzer",
    subtitle: "Review what launches with Windows. Disable reversibly, never delete.",
    icon: Rocket,
    tone: "violet",
  },
  disk: {
    title: "Disk Analyzer",
    subtitle: "See which profile folders use the most space. Strictly read-only.",
    icon: HardDrive,
    tone: "warning",
  },
  activity: {
    title: "Activity Log",
    subtitle: "A local history of every scan and cleanup. Nothing leaves this PC.",
    icon: Activity,
    tone: "neutral",
  },
  settings: {
    title: "Settings",
    subtitle: "Theme, behavior, and exactly what CleanStart is allowed to touch.",
    icon: Settings,
    tone: "neutral",
  },
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
  const heading = PAGE_HEADINGS[activeScreen];

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden text-ink">
      <MeshBackground />
      <TopBar activeScreen={activeScreen} onNavigate={onNavigate} />
      <main
        key={activeScreen}
        className="clean-scrollbar animate-screen relative min-h-0 flex-1 overflow-y-auto px-8 pb-6 pt-5"
      >
        {heading && (
          <header className="mx-auto mb-5 flex w-full max-w-[1180px] items-center gap-3.5">
            <span
              className="grad-tile grid h-12 w-12 shrink-0 place-items-center rounded-[14px]"
              data-tone={heading.tone}
            >
              <heading.icon className="h-6 w-6" />
            </span>
            <div>
              <h1 className="type-display text-[22px] font-bold leading-7 text-ink">
                {heading.title}
              </h1>
              <p className="mt-0.5 text-[13px] leading-5 text-muted">{heading.subtitle}</p>
            </div>
          </header>
        )}
        {children}
      </main>
      <StatusBar />
    </div>
  );
}

/* Animated gradient mesh — fixed layer behind all content. Surfaces are
   translucent, so they pick up this colored light. */
function MeshBackground() {
  return (
    <div className="app-mesh" aria-hidden="true">
      <span className="mesh-blob b1" />
      <span className="mesh-blob b2" />
      <span className="mesh-blob b3" />
      <span className="mesh-blob b4" />
    </div>
  );
}

function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={clsx("shrink-0", className)} aria-hidden="true">
      <defs>
        <linearGradient id="cs-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent))" />
          <stop offset="100%" stopColor="rgb(var(--grad-a))" />
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
        stroke="rgb(var(--c-accent))"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TopBar({
  activeScreen,
  onNavigate,
}: {
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Slide the liquid indicator behind the active tab. Measured against the
  // rail; written as CSS vars so the spring transition handles the motion.
  useLayoutEffect(() => {
    const rail = railRef.current;
    const button = buttonRefs.current[activeScreen];
    if (!rail || !button) return;

    const place = () => {
      const railBox = rail.getBoundingClientRect();
      const box = button.getBoundingClientRect();
      rail.style.setProperty("--nav-x", `${box.left - railBox.left}px`);
      rail.style.setProperty("--nav-w", `${box.width}`);
    };

    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [activeScreen]);

  return (
    <header
      className="glass-strong relative z-[var(--z-sticky)] flex h-[56px] shrink-0 items-stretch justify-between border-b border-edge/10"
      data-tauri-drag-region
    >
      <div className="flex min-w-0 items-stretch">
        <div className="flex items-center gap-2.5 pl-5 pr-6" data-tauri-drag-region>
          <LogoMark />
          <div className="pointer-events-none flex items-baseline gap-2">
            <span className="type-display text-[15px] font-bold leading-none text-ink">
              CleanStart
            </span>
            <span className="text-[10px] font-semibold text-muted/70">v1.0.0</span>
          </div>
        </div>

        <nav className="nav-rail flex items-center gap-1" aria-label="Main navigation" ref={railRef}>
          <span className="nav-indicator" aria-hidden="true" />
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeScreen;
            return (
              <button
                key={item.id}
                ref={(node) => {
                  buttonRefs.current[item.id] = node;
                }}
                data-testid={`nav-${item.id}`}
                data-active={active}
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(item.id)}
                className={clsx(
                  "nav-pill flex h-8 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold",
                  active ? "text-app" : "text-muted hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>
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
    <div className="flex items-stretch">
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
    <footer className="glass-strong relative z-[var(--z-sticky)] flex h-9 shrink-0 items-center justify-between border-t border-edge/10 px-8 text-[11px] font-medium text-muted">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        <span>Preview-first · Recycle Bin only · Permanent deletion disabled</span>
      </div>
      <div className="flex items-center gap-2">
        <Lock className="h-3.5 w-3.5" />
        <span>Local-only. No telemetry, no account, no cloud.</span>
      </div>
    </footer>
  );
}
