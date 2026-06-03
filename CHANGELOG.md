# Changelog

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
