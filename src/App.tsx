import { useState } from "react";
import { Shell } from "./components/Shell";
import type { ScreenId } from "./lib/types";
import { ActivityLogScreen } from "./screens/ActivityLog";
import { DashboardScreen } from "./screens/Dashboard";
import { DiskAnalyzerScreen } from "./screens/DiskAnalyzer";
import { SettingsScreen } from "./screens/Settings";
import { StartupAnalyzerScreen } from "./screens/StartupAnalyzer";
import { TempCleanerScreen } from "./screens/TempCleaner";
import { SettingsProvider } from "./state/SettingsContext";
import { ToastProvider } from "./state/ToastContext";

function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("dashboard");

  return (
    <SettingsProvider>
      <ToastProvider>
        <Shell activeScreen={activeScreen} onNavigate={setActiveScreen}>
          {activeScreen === "dashboard" && <DashboardScreen onNavigate={setActiveScreen} />}
          {activeScreen === "temp" && <TempCleanerScreen />}
          {activeScreen === "startup" && <StartupAnalyzerScreen />}
          {activeScreen === "disk" && <DiskAnalyzerScreen />}
          {activeScreen === "activity" && <ActivityLogScreen />}
          {activeScreen === "settings" && <SettingsScreen />}
        </Shell>
      </ToastProvider>
    </SettingsProvider>
  );
}

export default App;
