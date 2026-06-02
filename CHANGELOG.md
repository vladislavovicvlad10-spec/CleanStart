# Changelog

## v0.2.0-alpha - 2026-06-02

### Added

- Added a new Tauri + React + TypeScript + Tailwind UI prototype.
- Added a redesigned Dashboard with light glassmorphism styling, centered top
  navigation, summary cards, quick actions, recent activity, and bottom status.
- Added interactive prototype navigation, buttons, and Recycle Bin toggle.
- Added a Dashboard screenshot for the `v0.2.0-alpha` UI prototype.

### Known Limitations

- Real cleanup is not implemented or connected in the Tauri prototype yet.
- Startup analysis, disk analysis, and cleanup screens currently use mock/demo
  data only.
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
- Browser caches, Prefetch, Program Files, and broad Windows folders are not part of v0.1.0 cleanup.
- Startup entries are never disabled automatically.
