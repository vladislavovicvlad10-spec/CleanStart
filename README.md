# CleanStart

CleanStart is an open-source, safety-first Windows maintenance app. It is built
to be transparent and realistic: preview first, explain what will happen, require
confirmation before cleanup, and avoid fake optimizer or antivirus claims.

The current main app is being developed with Tauri + React + TypeScript +
Tailwind, with a Rust backend for safety-critical cleanup validation. The older
PyQt6 MVP is preserved in `legacy-pyqt/` as the v0.1.0 reference.

## Why CleanStart Exists

Many cleanup tools use aggressive language, unclear deletion rules, or promises
they cannot honestly prove. CleanStart is built as a safer alternative: preview
first, explain what is being reviewed, require confirmation before real cleanup,
and avoid fake speed boost, scareware, registry cleaner, RAM booster, malware
removal, or antivirus claims.

## Current Version

`v1.0.0` is the first complete release. Every module is real and connected:

- Temp Cleaner with preview scan, dry run, and Recycle Bin cleanup.
- Startup Analyzer with real registry/Startup-folder entries and reversible
  enable/disable (the Task Manager `StartupApproved` mechanism — never deletes).
- Disk Analyzer with strictly read-only profile-folder usage and largest files.
- Persistent local Activity Log (JSON in `%LOCALAPPDATA%\CleanStart`).
- Real Settings: dark/light theme, launch with Windows, approved scan locations.
- Local-first with no login, telemetry, analytics, cloud sync, or external
  server calls.

## Feature Status

| Area | Status |
| --- | --- |
| Dashboard | Real stats from local history: space reclaimed, last cleanup/scan, recent activity. |
| Temp Cleaner | Real preview scan, dry run, selected cleanup through Recycle Bin, browser cache cleanup for cache folders only. |
| Startup Analyzer | Real entries from Run keys and Startup folders. Reversible enable/disable for current-user entries; machine-wide entries shown read-only. |
| Disk Analyzer | Real read-only scan of profile folders with usage bars, largest files, and drive stats. No deletion possible from this screen. |
| Activity Log | Persistent local JSON history (capped at 500 events) with filters, copy, and clear. |
| Settings | Real settings: theme, launch at startup, approved scan locations, safety principles. |

## Temp Cleaner Targets

CleanStart only scans approved temporary/cache locations:

- `%TEMP%`
- `%LOCALAPPDATA%\Temp`
- `C:\Windows\Temp` when accessible
- Microsoft Edge cache folders only
- Google Chrome cache folders only
- Brave cache folders only
- Firefox cache folders only

Approved root folders are not moved or deleted directly. CleanStart treats them
as cleanup groups, enumerates safe child files/folders inside them, skips
symlinks/reparse points/junctions, and moves selected accessible children to
Recycle Bin when supported.

## Browser Safety

Browser cleanup targets cache only.

CleanStart does not clean:

- cookies
- passwords
- history
- sessions
- autofill
- bookmarks

Some browser cache files may stay locked while the browser is running. Close the
browser and run Preview scan again to clean more cache files.

## Safety Principles

- Preview-first.
- Explicit confirmation before cleanup.
- Recycle Bin only.
- Permanent deletion is disabled.
- Rust backend validates selected cleanup paths.
- Personal folders are not targeted.
- Locked/protected files are skipped and reported.
- No automatic cleanup.
- No telemetry.
- No login or accounts.
- No cloud sync.
- No fake optimizer claims.
- No antivirus or malware-detection claims.

## Startup Analyzer Safety

- Entries are read from `HKCU/HKLM ...\CurrentVersion\Run` (including
  WOW6432Node) and the user/common Startup folders.
- Disable/enable writes the same reversible `StartupApproved` registry state
  that Windows Task Manager uses. The original Run value or shortcut is never
  deleted, so every change can be undone from CleanStart or Task Manager.
- Machine-wide (HKLM / common folder) entries are read-only because changing
  them requires administrator rights.

## Known Limitations

- Locked files may remain.
- Permission-protected files may be skipped.
- Some browser cache files may require closing the browser first.
- Permanent deletion is disabled.
- Auto cleanup is not implemented.
- Browser cleanup targets cache only, not cookies/passwords/history/sessions.
- Disk Analyzer applies depth/time/file-count limits, so very large profiles are
  reported as a partial (but safe) snapshot.

## Screenshots

Use `docs/screenshots/` for release screenshots and avoid exposing real
usernames, personal paths, private files, tokens, emails, or account names.

![CleanStart v1.0.0 Dashboard](docs/screenshots/cleanstart-v1.0.0-dashboard.png)

![CleanStart v1.0.0 Temp Cleaner](docs/screenshots/cleanstart-v1.0.0-temp-cleaner.png)

![CleanStart v1.0.0 Settings (light theme)](docs/screenshots/cleanstart-v1.0.0-settings-light.png)

![CleanStart v0.2.0-alpha.1 Dashboard](docs/screenshots/cleanstart-v0.2.0-alpha1-dashboard.png)

![CleanStart v0.2.0-alpha.1 Temp Cleaner Preview](docs/screenshots/cleanstart-v0.2.0-alpha1-temp-cleaner-preview.png)

![CleanStart v0.2.0-alpha.1 Cleanup Result](docs/screenshots/cleanstart-v0.2.0-alpha1-temp-cleaner-cleanup-result.png)

## Requirements

- Windows 10/11.
- Node.js 20+ recommended.
- npm 10+.
- Rust/Cargo with the Visual Studio C++ build tools for the full Tauri desktop
  runtime.

## Install

```powershell
git clone https://github.com/vladislavovicvlad10-spec/CleanStart.git
cd CleanStart
npm install
```

## Run

Desktop development mode:

```powershell
npm run tauri dev
```

This opens the CleanStart Tauri desktop window. It may also start a local Vite
dev server in the background, but you do not need to open it in a browser.

Frontend-only browser preview, only if you explicitly need it:

```powershell
npm run dev:web
```

## Build

Frontend build:

```powershell
npm run build
```

Tauri desktop build:

```powershell
npm run tauri build
```

Windows helper script:

```powershell
.\scripts\build_windows.ps1
```

## Project Structure

```text
src/                 React + TypeScript UI
src/screens/         One file per screen (Dashboard, Temp Cleaner, ...)
src/components/      App shell (sidebar, title bar) and the UI kit
src/lib/             Typed IPC client, shared types, formatting helpers
src/state/           Settings and toast providers
src-tauri/src/       Rust backend modules:
                     cleanup, startup, disk, history, settings, error, util
docs/                Screenshot notes and design references
legacy-pyqt/         Preserved PyQt6 v0.1.0 MVP/reference
```

## Legacy PyQt Version

`legacy-pyqt/` contains the old PyQt6 v0.1.0 implementation/reference. The
current main app is the Tauri/React/Rust version at the repository root.

## Roadmap

See [ROADMAP.md](ROADMAP.md). The v1.0.0 milestone (Startup Analyzer, Disk
Analyzer, Activity Log persistence, real settings, UI redesign) is complete.
Future work must not change the safety-first boundaries above.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep UI components real and interactive.
Do not replace screens with static screenshots, and do not add telemetry, login,
cloud sync, fake optimizer claims, or antivirus claims.
