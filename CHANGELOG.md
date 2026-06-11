# Changelog

## v1.0.0 - 2026-06-11

CleanStart 1.0 — every module is now real, connected, and safety-bounded.

### Added

- **Startup Analyzer (real):** reads actual Windows startup entries from
  `HKCU/HKLM ...\CurrentVersion\Run` (including WOW6432Node) and the user/common
  Startup folders. Enable/disable uses the same reversible `StartupApproved`
  mechanism as Task Manager — entries are toggled, never deleted. Machine-wide
  entries are shown read-only (admin rights would be required).
- **Disk Analyzer (real):** strictly read-only scan of user-profile folders with
  per-folder usage bars, largest-files list, drive used/free stats, and hard
  scan limits (depth/time/file count). No deletion code exists in this module.
- **Persistent Activity Log:** scans and cleanups are recorded to a local JSON
  file (`%LOCALAPPDATA%\CleanStart\activity-log.json`, capped at 500 entries)
  with day grouping, filters, copy-to-clipboard, and confirm-to-clear.
- **Real Settings:** dark/light theme (dark-first), "start CleanStart with
  Windows" (current-user registry entry), read-only list of approved cleanup
  locations served by the backend, and safety principles.
- Dashboard now shows real data: total space reclaimed, last cleanup, last scan,
  and recent activity from the persistent history.
- Toast notification system, modal system, and subtle motion (rise/pop/shimmer)
  with `prefers-reduced-motion` support.

### Changed

- **Complete UI redesign:** dark-first premium theme with teal accent, sidebar
  navigation, custom title bar, status bar with permanent safety messaging, and
  a full light theme. Tokens are CSS variables consumed by Tailwind.
- **Rust backend restructured** into modules (`cleanup`, `startup`, `disk`,
  `history`, `settings`, `error`, `util`) with a unified `thiserror`-based
  `AppError` type so every IPC command returns readable errors.
- Settings storage migrated to a richer `settings.json` (theme, launch at
  startup); the legacy `moveToRecycleBin`-only file still parses.
- Frontend restructured: `src/screens/`, `src/components/`, `src/lib/` (typed
  IPC client + shared types), `src/state/` (settings/toast providers). All mock
  data removed.

### Safety

- Permanent deletion remains disabled; the Recycle Bin toggle was removed from
  the UI and the backend now forces `moveToRecycleBin = true` when saving.
- Startup changes are reversible by design and never delete the original entry.
- Disk Analyzer cannot delete anything — it has no destructive commands.
- Activity history and settings are local-only; no telemetry, login, or cloud.

## v0.2.0-alpha.1 - 2026-06-03

### Added

- Real Temp Cleaner preview scan for approved temp/cache locations.
- Dry run support.
- Selected cleanup through Recycle Bin.
- Browser cache cleanup for cache folders only.
- Rust backend validation for cleanup paths.
- Cleanup confirmation and result modals.
- Partial failure handling for locked/protected files.
- Compact warning summary with details.
- Auto refresh after cleanup.

### Changed

- Temp Cleaner no longer relies on mock rows after preview scan.
- Duplicate temp roots are deduplicated.
- User-facing paths are cleaned up.
- Last scan time is synchronized.
- Cleanup result wording now distinguishes completed, completed with warnings,
  and could not finish.

### Safety

- Permanent deletion remains disabled.
- No cookies/passwords/history/sessions are cleaned.
- Personal folders are not targeted.
- Locked/protected files are skipped and reported.
- Approved root folders are not deleted directly.

### Known Limitations

- Some files may be skipped if locked by Windows or browsers.
- Users may need to close browsers and scan again to clean more cache.
- Startup Analyzer and Disk Analyzer remain prototype modules.

## v0.2.0-alpha - 2026-06-02

### Added

- Added a new Tauri + React + TypeScript + Tailwind UI prototype.
- Added a redesigned Dashboard with light glassmorphism styling, centered top
  navigation, summary cards, quick actions, recent activity, and bottom status.
- Added interactive prototype navigation, buttons, and Recycle Bin toggle.
- Added a Dashboard screenshot for the `v0.2.0-alpha` UI prototype.

### Known Limitations

- Real cleanup was not implemented or connected in this first Tauri prototype.
- Startup analysis, disk analysis, and cleanup screens used mock/demo data only.
- This alpha should not be described as a working cleaner.

## v0.1.0 - 2026-06-02

### Added

- Safe Temp Cleaner with preview, dry-run, confirmation, and recycle-bin preference.
- Startup Analyzer with read-only advisory labels.
- Disk Analyzer Lite for profile folders or one selected folder.
- Activity Log for scans, cleanup, warnings, and skipped errors.
- Settings/About section with safety principles and limitations.
- Basic pytest coverage for safety-critical helper behavior.
- Open-source release docs: README, LICENSE, ROADMAP, and CONTRIBUTING.

### Changed

- Rebranded the app from Cleaner V2 to CleanStart.
- Replaced fake optimizer/AI language with realistic maintenance language.
- Removed local email/password authentication from the app path.

### Safety

- Cleanup is no longer automatic.
- Browser caches, Prefetch, Program Files, and broad Windows folders are not part
  of v0.1.0 cleanup.
- Startup entries are never disabled automatically.
