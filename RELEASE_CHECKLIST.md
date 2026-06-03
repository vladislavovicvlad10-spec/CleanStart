# Release Checklist

Use this checklist before publishing CleanStart `v0.2.0-alpha.1`.

## 1. Automated Verification

Run from the repository root:

```powershell
npm run typecheck
npm run build
```

Run from `src-tauri/`:

```powershell
cargo fmt --check
cargo test
```

Optional Tauri smoke:

```powershell
npm run tauri dev
```

Confirm:

- The app opens as a desktop window.
- Dashboard navigation works.
- Temp Cleaner opens.
- No scan starts automatically.

## 2. Temp Cleaner Manual Test

Verify:

- Preview scan reviews approved locations only.
- Dry run completes without changing files.
- Clean selected requires confirmation.
- Clean selected moves accessible child files/folders to Recycle Bin.
- Permanent deletion does not happen.
- Approved root folders are not deleted directly.
- Browser cache cleanup targets cache folders only.
- Cookies/passwords/history/sessions/autofill/bookmarks are not cleaned.
- Locked/protected files are reported instead of hidden.
- Cleanup result distinguishes completed, completed with warnings, and could not finish.
- Auto refresh runs after cleanup.

## 3. Screenshot Checklist

Read [docs/screenshots/README.md](docs/screenshots/README.md).

Capture:

- `docs/screenshots/cleanstart-v0.2.0-alpha1-dashboard.png`
- `docs/screenshots/cleanstart-v0.2.0-alpha1-temp-cleaner-preview.png`
- `docs/screenshots/cleanstart-v0.2.0-alpha1-temp-cleaner-cleanup-result.png`

Privacy review:

- No secrets, tokens, emails, or account names.
- No private documents or private filenames.
- No expanded failed item details showing full `C:\Users...` paths.
- Prefer `%LOCALAPPDATA%`/approved temp labels or non-sensitive demo paths.
- No browser tabs or unrelated desktop clutter.

## 4. Documentation Checklist

Confirm:

- README is updated for `v0.2.0-alpha.1`.
- README describes Tauri + React + TypeScript + Tailwind + Rust backend.
- README clearly states Temp Cleaner is real alpha behavior.
- README clearly states Startup Analyzer and Disk Analyzer are prototypes.
- README documents Recycle Bin-only cleanup.
- README documents browser cache-only cleanup.
- README documents no telemetry, no login, no cloud sync, and no fake optimizer claims.
- CHANGELOG has a `v0.2.0-alpha.1` entry.
- ROADMAP marks completed Temp Cleaner alpha work and keeps future modules scoped.
- Screenshots are updated.

## 5. Privacy And Safety Checklist

- No telemetry, analytics, login, cloud sync, or external servers.
- Do not commit `config/settings.json`.
- Do not commit `logs/` or crash logs.
- Do not include real usernames, private paths, or personal files in screenshots.
- Do not package `venv/`, cache folders, local config, logs, or private data.
- Do not claim full PC cleaning, optimization, antivirus, malware removal, registry cleaning, RAM boosting, FPS boosting, or complete Windows repair.

## 6. Build Windows App

Install dependencies:

```powershell
npm install
```

Build frontend:

```powershell
npm run build
```

Build Tauri desktop app:

```powershell
npm run tauri build
```

Windows helper script:

```powershell
.\scripts\build_windows.ps1
```

Confirm ignored/generated folders are not staged:

```powershell
git status --short
```

## 7. GitHub Release Checklist

- Repository is public and has a clear README.
- License is present and compatible with open-source release.
- Safety-first scope is explicit.
- Tests and local verification commands are documented.
- Release checklist and roadmap are present.
- Screenshots are privacy-reviewed.
- No secrets, personal paths, logs, config, virtualenv, or build caches are committed.
- Suggested repository topics: `windows`, `tauri`, `react`, `typescript`, `rust`, `cleanup`, `maintenance-tool`, `open-source`, `privacy-first`.

## 8. Tag Release

```powershell
git tag -a v0.2.0-alpha.1 -m "CleanStart v0.2.0-alpha.1"
git push origin v0.2.0-alpha.1
```

## Legacy v0.1.0 Notes

The old PyQt6 MVP remains in `legacy-pyqt/` for reference. Do not use the legacy
PyQt release checklist for the current Tauri alpha unless you are explicitly
testing the preserved v0.1.0 implementation.
