# Release Checklist

Use this checklist before publishing CleanStart v0.1.0.

## 1. Test Locally

```powershell
pytest
black --check .
python -m compileall core gui utils tests main.py
```

Run PyQt smoke checks:

```powershell
$env:QT_QPA_PLATFORM='offscreen'
python -c "from PyQt6.QtWidgets import QApplication; from main import CleanStartWindow, save_language; save_language('en'); app = QApplication([]); window = CleanStartWindow(); assert window.dashboard_temp_value.text() == 'Not scanned yet'; print('launch smoke ok')"
```

Run the app:

```powershell
python main.py
```

Verify:

- Dashboard shows "Not scanned yet" before user actions.
- Temp Cleaner previews before cleanup.
- Cleanup requires confirmation.
- Startup Analyzer makes no changes.
- Disk Analyzer scans profile folders or one chosen folder only.
- Activity Log stays local.
- Language selector offers English and Russian.
- Cleanup result dialog keeps the app open after success or failure.
- Recycle Bin failures are reported and do not fall back to permanent deletion.

## 2. Prepare Screenshots

Read [docs/screenshots/README.md](docs/screenshots/README.md).

Capture:

- Dashboard
- Temp Cleaner preview
- Startup Analyzer results
- Disk Analyzer Lite results
- Activity Log

Do not expose real usernames, personal paths, private files, tokens, or account names.

## 3. Privacy Checklist

- No telemetry, analytics, login, cloud sync, or external servers.
- Do not commit `config/settings.json`.
- Do not commit `logs/` or crash logs.
- Do not include real usernames, private paths, or personal files in screenshots.
- Do not package `venv/`, cache folders, local config, logs, or private data.

## 4. Build Windows App

Install dependencies:

```powershell
pip install -r requirements.txt
```

Build folder-based app:

```powershell
.\scripts\build_windows.ps1
```

Optional one-file build:

```powershell
.\scripts\build_windows.ps1 -OneFile
```

If a real icon is ready, place it at:

```text
assets/app.ico
```

Confirm ignored/generated folders are not staged:

```powershell
git status --short
```

## 5. Smoke-Test Build

Run:

```powershell
.\dist\CleanStart\CleanStart.exe
```

For one-file builds:

```powershell
.\dist\CleanStart.exe
```

Confirm the app opens and no scan starts automatically.

## 6. OpenAI Codex for Open Source Application Checklist

- Repository is public and has a clear README.
- License is present and compatible with open-source release.
- Safety-first scope is explicit: no fake optimizer claims and no antivirus claims.
- Tests and local verification commands are documented.
- Release checklist and roadmap are present.
- Screenshots are privacy-reviewed.
- No secrets, personal paths, logs, config, virtualenv, or build caches are committed.

## 7. Tag Release

```powershell
git tag -a v0.1.0 -m "CleanStart v0.1.0"
git push origin v0.1.0
```

## 8. Create GitHub Release

- Release title: `CleanStart v0.1.0`
- Attach packaged Windows artifact if available.
- Include safety notes from README.
- Include known limitations.
- Include screenshot set after privacy review.
- Suggested repository topics: `windows`, `python`, `pyqt6`, `cleanup`, `maintenance-tool`, `open-source`, `privacy-first`.
