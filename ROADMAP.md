# Roadmap

CleanStart will stay safety-first. Future features should be transparent,
reversible where possible, and useful without pretending to be antivirus,
malware removal, a registry cleaner, a RAM booster, or a performance booster.

## Completed In v0.2.0-alpha.1

- Temp Cleaner UI.
- Temp Cleaner interactive selection.
- Real preview scan for approved temp/cache locations.
- Dry run.
- Recycle Bin selected cleanup.
- Browser cache cache-only cleanup.
- Compact warnings.
- Cleanup confirmation modal.
- Cleanup result modal.
- Safety validation in the Rust backend.
- Deduplication for temp roots that resolve to the same path.
- Safe cleanup of approved root contents without deleting root folders directly.

## Near-Term Priorities

- Startup Analyzer read-only backend.
- Disk Analyzer real scan.
- Activity Log persistence.
- Settings polish.
- Screenshot set for each connected module.
- Accessibility and keyboard navigation pass.

## Future Features

- Startup Shield: optional user-approved startup change tracking.
- Browser Cleanup: advanced cache cleanup options with browser-specific previews.
- App Leftovers Finder: detect leftover folders after uninstall, without deleting automatically.
- Duplicate Finder: find duplicate files and let users decide what to keep.
- Permission Checker: explain access-denied folders in plain language.
- Network Monitor Lite: show basic local connectivity status without background surveillance.
- DNS Advisor: explain current DNS settings and common safer alternatives.
- Update Advisor: list software update hints without forced changes.
- Security Scanner/Advisor: provide safe configuration checks without malware verdicts.
- Auto cleanup later, only with clear scope, explicit settings, and safety review.
- Restore/history later where the stack can support it safely.

## Not Planned

- Telemetry, analytics, login, account sync, or cloud sync.
- Antivirus or malware removal claims.
- Registry cleaning.
- RAM boosting.
- FPS boosting.
- Forced cleanup or silent deletion.
