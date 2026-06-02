# Changelog

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
