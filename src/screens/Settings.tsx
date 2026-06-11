import {
  CheckCircle2,
  FolderSearch,
  Info,
  Lock,
  Moon,
  Recycle,
  Rocket,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { api, friendlyError, isTauri } from "../lib/ipc";
import type { ApprovedLocation, ThemeId } from "../lib/types";
import { Card, IconBox, Pill, Toggle } from "../components/ui";
import { useSettings } from "../state/SettingsContext";
import { useToast } from "../state/ToastContext";

const SAFETY_PRINCIPLES = [
  "Preview first, confirm always — no automatic cleanup, ever.",
  "Recycle Bin only. Permanent deletion is disabled in this release.",
  "Personal folders (Documents, Desktop, Downloads…) are never targeted.",
  "Locked or protected files are skipped and reported, not forced.",
  "No telemetry, no account, no cloud. Everything stays on this PC.",
  "No antivirus, malware, or “speed boost” claims.",
];

export function SettingsScreen() {
  const { settings, setTheme, setLaunchAtStartup } = useSettings();
  const { toast } = useToast();
  const [locations, setLocations] = useState<ApprovedLocation[]>([]);
  const [startupBusy, setStartupBusy] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    api
      .getApprovedCleanupLocations()
      .then(setLocations)
      .catch(() => undefined);
  }, []);

  const toggleLaunchAtStartup = async (enabled: boolean) => {
    setStartupBusy(true);
    try {
      await setLaunchAtStartup(enabled);
      toast({
        tone: "success",
        title: enabled
          ? "CleanStart will start with Windows."
          : "CleanStart will no longer start with Windows.",
      });
    } catch (error) {
      toast({
        tone: "error",
        title: "Could not update the startup setting.",
        details: [friendlyError(error)],
      });
    } finally {
      setStartupBusy(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-[1180px] grid-cols-[minmax(0,1fr)_320px] items-start gap-4">
      <div className="space-y-4">
        <SettingsCard
          title="Appearance"
          description="CleanStart is designed dark-first, with a full light theme."
          delay={0}
        >
          <div className="flex gap-2">
            <ThemeOption
              theme="dark"
              label="Dark"
              icon={<Moon className="h-4 w-4" />}
              active={settings.theme === "dark"}
              onSelect={setTheme}
            />
            <ThemeOption
              theme="light"
              label="Light"
              icon={<Sun className="h-4 w-4" />}
              active={settings.theme === "light"}
              onSelect={setTheme}
            />
          </div>
        </SettingsCard>

        <SettingsCard
          title="Behavior"
          description="How CleanStart integrates with Windows."
          delay={50}
        >
          <SettingRow
            icon={<IconBox icon={Rocket} tone="accent" size="sm" />}
            title="Start CleanStart with Windows"
            detail="Adds a normal startup entry for the current user. Off by default."
            control={
              <Toggle
                checked={settings.launchAtStartup}
                disabled={startupBusy || !isTauri()}
                onChange={toggleLaunchAtStartup}
                label="Start CleanStart with Windows"
              />
            }
          />
          <SettingRow
            icon={<IconBox icon={Recycle} tone="success" size="sm" />}
            title="Cleanup destination: Recycle Bin"
            detail="Permanent deletion is disabled by design and cannot be enabled in this release."
            control={
              <Pill tone="success">
                <Lock className="h-3 w-3" /> Always on
              </Pill>
            }
          />
        </SettingsCard>

        <SettingsCard
          title="Approved scan locations"
          description="The Temp Cleaner only ever touches these locations. This list is fixed in the app for safety — it cannot be extended to personal folders."
          delay={100}
        >
          {locations.length === 0 ? (
            <p className="flex items-center gap-2 text-[13px] text-muted">
              <Info className="h-4 w-4" />
              {isTauri()
                ? "Locations load from the backend when available."
                : "Run the desktop app to see the approved locations."}
            </p>
          ) : (
            <div className="space-y-1.5">
              {dedupeLocations(locations).map((location) => (
                <div
                  key={`${location.name}-${location.displayPath}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 ring-1 ring-edge/10"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FolderSearch className="h-4 w-4 shrink-0 text-accent" />
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-ink">
                        {location.name}
                      </div>
                      <div className="truncate font-mono text-[11px] text-muted">
                        {location.displayPath}
                      </div>
                    </div>
                  </div>
                  <Pill
                    tone={location.protected ? "neutral" : location.exists ? "success" : "warning"}
                    className="shrink-0"
                  >
                    {location.protected ? "preview only" : location.exists ? "active" : "not found"}
                  </Pill>
                </div>
              ))}
            </div>
          )}
        </SettingsCard>

        <SettingsCard title="About" description="" delay={150}>
          <div className="grid grid-cols-3 gap-3 text-[13px]">
            <AboutItem label="Version" value="CleanStart 1.0.0" />
            <AboutItem label="License" value="MIT — open source" />
            <AboutItem label="Privacy" value="Local-only, no telemetry" />
          </div>
        </SettingsCard>
      </div>

      <Card className="animate-rise p-5" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center gap-3">
          <IconBox icon={ShieldCheck} tone="success" size="md" />
          <h3 className="text-[15px] font-bold text-ink">Safety principles</h3>
        </div>
        <div className="mt-4 space-y-3">
          {SAFETY_PRINCIPLES.map((principle) => (
            <p key={principle} className="flex items-start gap-2.5 text-[13px] leading-5 text-muted">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>{principle}</span>
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}

function dedupeLocations(locations: ApprovedLocation[]): ApprovedLocation[] {
  const seen = new Set<string>();
  return locations.filter((location) => {
    const key = `${location.name}|${location.displayPath}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function SettingsCard({
  title,
  description,
  children,
  delay = 0,
}: {
  title: string;
  description: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <Card className="animate-rise p-5" style={{ animationDelay: `${delay}ms` }}>
      <h3 className="text-[15px] font-bold text-ink">{title}</h3>
      {description && <p className="mt-1 text-[13px] leading-5 text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function SettingRow({
  icon,
  title,
  detail,
  control,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-edge/10 py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-ink">{title}</div>
          <div className="mt-0.5 text-xs leading-4 text-muted">{detail}</div>
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function ThemeOption({
  theme,
  label,
  icon,
  active,
  onSelect,
}: {
  theme: ThemeId;
  label: string;
  icon: ReactNode;
  active: boolean;
  onSelect: (theme: ThemeId) => void;
}) {
  return (
    <button
      onClick={() => onSelect(theme)}
      className={clsx(
        "flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all duration-150",
        active
          ? "bg-accent/10 text-accent ring-1 ring-accent/30"
          : "bg-surface-2 text-muted ring-1 ring-edge/10 hover:text-ink",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function AboutItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2.5 ring-1 ring-edge/10">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted/70">{label}</div>
      <div className="mt-0.5 font-semibold text-ink">{value}</div>
    </div>
  );
}
