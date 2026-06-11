import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, isTauri, recordActivity } from "../lib/ipc";
import type { AppSettings, ThemeId } from "../lib/types";

const THEME_STORAGE_KEY = "cleanstart.theme";

const DEFAULT_SETTINGS: AppSettings = {
  moveToRecycleBin: true,
  theme: "dark",
  launchAtStartup: false,
};

interface SettingsContextValue {
  settings: AppSettings;
  loaded: boolean;
  setTheme: (theme: ThemeId) => void;
  setLaunchAtStartup: (enabled: boolean) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage can be unavailable — theme still applies for this session.
  }
}

export function initialTheme(): ThemeId {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // fall through to default
  }
  return "dark";
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => ({
    ...DEFAULT_SETTINGS,
    theme: initialTheme(),
  }));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    applyTheme(settings.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isTauri()) {
      setLoaded(true);
      return;
    }
    api
      .getAppSettings()
      .then((stored) => {
        setSettings(stored);
        applyTheme(stored.theme);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const persist = useCallback((next: AppSettings) => {
    setSettings(next);
    if (isTauri()) {
      void api.saveAppSettings(next).catch(() => undefined);
    }
  }, []);

  const setTheme = useCallback(
    (theme: ThemeId) => {
      applyTheme(theme);
      persist({ ...settings, theme });
    },
    [persist, settings],
  );

  const setLaunchAtStartup = useCallback(
    async (enabled: boolean) => {
      const confirmed = await api.setLaunchAtStartup(enabled);
      setSettings((current) => ({ ...current, launchAtStartup: confirmed }));
      recordActivity(
        "settings",
        confirmed ? "Launch at startup enabled" : "Launch at startup disabled",
        "CleanStart updated its own startup entry for the current user only.",
        "info",
      );
    },
    [],
  );

  return (
    <SettingsContext.Provider value={{ settings, loaded, setTheme, setLaunchAtStartup }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }
  return context;
}
