import clsx from "clsx";
import {
  Activity,
  ChevronRight,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { navItems } from "../data/mockData";
import type { ActivityEvent, Accent, ScreenId, SummaryCardData } from "../types/app";
import {
  Button,
  GlassCard,
  IconBubble,
  SafetyBanner,
  Toggle,
} from "./ui";

export function AppShell({
  activeScreen,
  onNavigate,
  children,
  recycleBin,
  onRecycleBinChange,
}: {
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  children: ReactNode;
  recycleBin: boolean;
  onRecycleBinChange: (checked: boolean) => void;
}) {
  return (
    <div className="relative h-screen overflow-hidden bg-[#edf6ff] text-ink">
      <img
        src="/assets/dashboard-background.png"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-95"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/40 via-white/15 to-blue-50/55" />
      <div className="relative mx-auto flex h-screen w-full max-w-[1520px] flex-col px-10 py-5 2xl:px-4">
        <TopNav activeScreen={activeScreen} onNavigate={onNavigate} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 pr-1 pt-5 clean-scrollbar">
          {children}
        </main>
        <BottomStatusBar recycleBin={recycleBin} onRecycleBinChange={onRecycleBinChange} />
      </div>
    </div>
  );
}

export function TopNav({
  activeScreen,
  onNavigate,
}: {
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}) {
  return (
    <header className="relative mx-auto flex min-h-[54px] w-full max-w-[1480px] items-center">
      <button
        className="relative z-10 flex items-center gap-3 rounded-3xl text-left transition-transform hover:-translate-y-0.5"
        onClick={() => onNavigate("dashboard")}
      >
        <img src="/assets/app-logo.svg" alt="CleanStart logo" className="h-12 w-12" />
        <span>
          <span className="block text-[1.35rem] font-black tracking-tight text-ink">CleanStart</span>
          <span className="block text-sm font-semibold text-slate-500">v0.2.0 prototype</span>
        </span>
      </button>
      <nav className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-white/80 bg-white/70 p-1.5 shadow-glass backdrop-blur-xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeScreen;
          return (
            <button
              key={item.id}
              data-testid={`nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={clsx(
                "flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all duration-200",
                active
                  ? "bg-white text-blue-700 shadow-soft ring-1 ring-blue-100"
                  : "text-slate-600 hover:bg-white/65 hover:text-blue-700",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}

export function SummaryCard({
  card,
  onAction,
}: {
  card: SummaryCardData;
  onAction: () => void;
}) {
  return (
    <GlassCard
      className="flex min-h-[202px] flex-col p-4"
      data-check-overlap="dashboard-summary"
      data-component="summary-card"
    >
      <div className="flex items-start gap-3">
        <IconBubble icon={card.icon} accent={card.accent} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 whitespace-nowrap text-[1.02rem] font-extrabold text-ink">{card.title}</h3>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.12)]" />
          </div>
          <p className="mt-1 text-[13px] leading-5 text-muted">{card.description}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 divide-x divide-blue-100">
        {card.metrics.map((metric) => (
          <div key={metric.label} className="px-2 first:pl-0">
            <div className="truncate text-[1.35rem] font-black tracking-tight text-ink">{metric.value}</div>
            <div className="mt-0.5 text-xs font-medium text-muted">{metric.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center gap-2.5 pt-4">
        <Button accent={card.accent} onClick={onAction} className="flex-1">
          {card.actionLabel}
        </Button>
        <button
          aria-label={`Open ${card.title}`}
          onClick={onAction}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-blue-100 bg-white/75 text-ink shadow-soft transition hover:bg-blue-50"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </GlassCard>
  );
}

export function QuickActionTile({
  label,
  icon,
  accent,
  onClick,
}: {
  label: string;
  icon: SummaryCardData["icon"];
  accent: Accent;
  onClick: () => void;
}) {
  return (
    <button
      data-testid={`quick-${label.toLowerCase().replace(/\s+/g, "-")}`}
      data-component="quick-action-tile"
      onClick={onClick}
      className="group flex h-[104px] flex-col items-center justify-center gap-3 rounded-3xl border border-blue-100 bg-white/66 px-3 text-center shadow-soft transition-all duration-200 hover:-translate-y-1 hover:bg-white"
    >
      <IconBubble icon={icon} accent={accent} size="md" />
      <span className={clsx("text-sm font-extrabold", accent === "green" ? "text-emerald-700" : accent === "purple" ? "text-violet-700" : "text-blue-700")}>
        {label}
      </span>
    </button>
  );
}

export function ActivityRow({ event }: { event: ActivityEvent }) {
  const iconMap: Record<Accent, typeof ShieldCheck> = {
    blue: ShieldCheck,
    purple: Activity,
    orange: HeartPulse,
    green: ShieldCheck,
    slate: Activity,
  };
  const Icon = iconMap[event.kind];
  return (
    <div
      className="grid grid-cols-[40px_1fr_auto_14px] items-center gap-3 border-b border-blue-100/80 px-4 py-2 last:border-b-0"
      data-component="activity-row"
    >
      <IconBubble icon={Icon} accent={event.kind} size="sm" />
      <div className="min-w-0">
        <div className="truncate text-sm font-extrabold text-ink">{event.title}</div>
        <div className="truncate text-xs font-medium text-muted">{event.subtitle}</div>
      </div>
      <div className="text-sm font-semibold text-slate-500">{event.time}</div>
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
    </div>
  );
}

export function BottomStatusBar({
  recycleBin,
  onRecycleBinChange,
}: {
  recycleBin: boolean;
  onRecycleBinChange: (checked: boolean) => void;
}) {
  return (
    <GlassCard className="mx-auto mt-3 flex min-h-[62px] w-full max-w-[1480px] items-center justify-between px-7 py-3" data-check-overlap="bottom-status">
      <div className="flex items-center gap-3">
        <IconBubble icon={ShieldCheck} accent="green" size="sm" />
        <div>
          <div className="text-sm font-extrabold text-emerald-700">System is ready</div>
          <div className="text-xs font-medium text-muted">No scan has started automatically.</div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm font-semibold text-muted">
        <HeartPulse className="h-5 w-5 text-emerald-600" />
        Last scan: mock data only
      </div>
      <div className="flex items-center gap-4 text-sm font-semibold text-muted">
        Move to Recycle Bin when supported
        <Toggle checked={recycleBin} onChange={onRecycleBinChange} label="Recycle Bin setting" testId="recycle-toggle" />
      </div>
    </GlassCard>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-sm font-medium text-muted">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function InspectorPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <GlassCard className="p-5">
      <h3 className="text-lg font-black text-ink">{title}</h3>
      <div className="mt-4 space-y-3 text-sm text-muted">{children}</div>
    </GlassCard>
  );
}

export { SafetyBanner };
