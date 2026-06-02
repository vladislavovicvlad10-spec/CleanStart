import {
  ClipboardCopy,
  Database,
  Eye,
  Info,
  Languages,
  Lock,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
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
  tempFiles as initialTempFiles,
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
import type { ScreenId, StartupEntry } from "./types/app";
import type { LucideIcon } from "lucide-react";

function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("dashboard");
  const [recycleBin, setRecycleBin] = useState(true);
  const [tempItems, setTempItems] = useState(initialTempFiles);
  const [startupSearch, setStartupSearch] = useState("");
  const [logFilter, setLogFilter] = useState("All");

  const selectedTempCount = tempItems.filter((item) => item.selected).length;

  return (
    <AppShell
      activeScreen={activeScreen}
      onNavigate={setActiveScreen}
      recycleBin={recycleBin}
      onRecycleBinChange={setRecycleBin}
    >
      {activeScreen === "dashboard" && (
        <DashboardScreen onNavigate={setActiveScreen} />
      )}
      {activeScreen === "temp" && (
        <TempCleanerScreen tempItems={tempItems} setTempItems={setTempItems} selectedCount={selectedTempCount} />
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
    <div className="dashboard-layout mx-auto w-full max-w-[1480px] space-y-4">
      <section className="grid min-h-[292px] grid-cols-[minmax(0,0.94fr)_minmax(460px,1.06fr)] items-center gap-9" data-check-overlap="hero">
        <div className="max-w-[680px] justify-self-start">
          <h1 className="max-w-[690px] text-[clamp(2.25rem,3.05vw,3.65rem)] font-black leading-[1.06] tracking-tight text-ink">
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
        <div className="hero-art-stage relative hidden h-[306px] w-full items-center justify-center overflow-visible xl:flex">
          <div className="absolute left-1/2 top-1/2 h-[230px] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-[999px] bg-blue-300/16 blur-[60px]" />
          <div className="absolute left-1/2 top-[54%] h-[190px] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-[999px] bg-white/30 blur-[42px]" />
          <img
            src="/assets/hero-floating.png"
            alt=""
            className="hero-reference-visual relative mx-auto h-[340px] w-full max-w-[670px] object-contain opacity-95 drop-shadow-[0_28px_58px_rgba(30,105,220,0.25)]"
          />
        </div>
      </section>

      <section className="grid grid-cols-5 gap-4" data-check-overlap="summary-row">
        {summaryCards.map((card) => (
          <SummaryCard key={card.title} card={card} onAction={() => onNavigate(actionTarget(card.title))} />
        ))}
      </section>

      <section className="grid grid-cols-[1fr_1fr] gap-5" data-check-overlap="lower-row">
        <GlassCard className="p-4" data-check-overlap="quick-actions">
          <div className="mb-4 flex items-center gap-3">
            <IconBubble icon={RefreshCw} accent="blue" size="sm" />
            <h2 className="text-xl font-black text-ink">Quick actions</h2>
          </div>
          <div className="grid grid-cols-4 gap-4">
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
          <div className="mt-4">
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
            {activityEvents.map((event) => (
              <ActivityRow key={`${event.title}-${event.time}`} event={event} />
            ))}
          </div>
        </GlassCard>
      </section>
    </div>
  );
}

function TempCleanerScreen({
  tempItems,
  setTempItems,
  selectedCount,
}: {
  tempItems: typeof initialTempFiles;
  setTempItems: (items: typeof initialTempFiles) => void;
  selectedCount: number;
}) {
  const rows = tempItems.map((item) => [
    <input
      key={`${item.id}-selected`}
      type="checkbox"
      checked={item.selected}
      onChange={() =>
        setTempItems(tempItems.map((candidate) => (candidate.id === item.id ? { ...candidate, selected: !candidate.selected } : candidate)))
      }
      className="h-4 w-4 rounded border-blue-200 text-blue-600"
    />,
    item.category,
    item.type,
    item.size,
    <span key={`${item.id}-path`} className="font-mono text-xs text-slate-600">
      {item.path}
    </span>,
  ]);

  return (
    <ScreenLayout>
      <PageHeader title="Temp Cleaner" subtitle={screenCopy.temp}>
        <div className="flex gap-3">
          <Button variant="secondary">Dry run</Button>
          <Button accent="blue">Review selected</Button>
          <Button variant="danger" disabled>
            Clean disabled in prototype
          </Button>
        </div>
      </PageHeader>
      <div className="grid grid-cols-[1fr_340px] gap-5">
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <MetricCard icon={Eye} label="Items previewed" value="218" />
            <MetricCard icon={Database} label="Estimated size" value="32.6 MB" />
            <MetricCard icon={ShieldCheck} label="Safety mode" value="Preview only" />
          </div>
          <GlassCard className="p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {["User temp", "Browser cache", "Installer leftovers", "Thumbnail cache"].map((chip) => (
                <button
                  key={chip}
                  className="rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-soft hover:bg-blue-50"
                >
                  {chip}
                </button>
              ))}
            </div>
            <Table headers={["", "Category", "Type", "Size", "Path"]} rows={rows} />
          </GlassCard>
        </div>
        <InspectorPanel title="Selection summary">
          <p>
            <strong className="text-ink">{selectedCount}</strong> mock item(s) selected.
          </p>
          <p>No files are removed in v0.2.0 prototype. The future backend must keep preview and confirmation gates.</p>
          <SafetyBanner compact>
            <span>Only selected safe temp items should be eligible for cleanup in a real build.</span>
          </SafetyBanner>
        </InspectorPanel>
      </div>
    </ScreenLayout>
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
  return <div className="mx-auto max-w-[1460px]">{children}</div>;
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
