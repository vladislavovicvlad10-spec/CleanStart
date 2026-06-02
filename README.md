# CleanStart

CleanStart is an open-source Windows maintenance tool for non-technical users.
It is designed to be safe, transparent, and realistic: no fake speed boosts, no
malware claims, no hidden cleanup, and no external data collection.

## Features

- Safe Temp Cleaner
  - Scans user-scoped temporary folders.
  - Shows files and folders before cleanup.
  - Supports dry-run preview.
  - Requires confirmation before deletion.
  - Uses the Recycle Bin when supported by the installed dependency.
  - If Recycle Bin cleanup fails, the item is skipped and reported instead of
    being permanently deleted.
  - Skips and logs permission errors.
- Startup Analyzer
  - Reads common Windows startup locations.
  - Shows app name, command/path, source, status, and advisor label.
  - Never disables entries automatically.
  - Uses simple labels: Normal, Unknown, Potentially unnecessary.
- Disk Analyzer Lite
  - Scans profile folders or one selected folder.
  - Shows largest files and folders with readable sizes.
  - Avoids whole-system scans by default.
  - Logs access-denied folders safely.
- Activity Log
  - Records scans, dry-runs, cleanup actions, warnings, and skipped errors.
  - Stays local on the user's machine.
- Settings / About
  - Shows safety principles and limitations.
  - Includes local English/Russian language selection.

## Screenshots

Screenshots will be added after the first packaged release. The placeholder
folder is [docs/screenshots](docs/screenshots).

Planned screenshot set:

- Dashboard
- Temp Cleaner preview
- Startup Analyzer results
- Disk Analyzer Lite results
- Activity Log

Before publishing screenshots, read
[docs/screenshots/README.md](docs/screenshots/README.md).

## Installation

CleanStart requires Windows and Python 3.11+.

```powershell
git clone https://github.com/YOUR_USERNAME/CleanStart.git
cd CleanStart
python -m venv venv
venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## How To Run

```powershell
python main.py
```

The app does not scan anything automatically on startup. Use the Dashboard
buttons or the feature tabs to start scans manually.

## Language

Open `Settings / About`, choose `English` or `Русский`, then click
`Apply language`. The choice is stored locally in `config/settings.json`; restart
CleanStart to apply the selected language.

## Build Windows Executable

CleanStart uses PyInstaller for local Windows builds.

```powershell
.\scripts\build_windows.ps1
```

Optional one-file build:

```powershell
.\scripts\build_windows.ps1 -OneFile
```

If you have a real icon, place it at `assets/app.ico` before building. Do not
commit fake or broken icon files.

The build output is written to `dist/`. Local runtime folders such as `logs/`,
`config/`, `venv/`, caches, and PyInstaller work folders are ignored by Git and
are not added as packaged data by the build script.

## Safety Principles

- Preview first. Cleanup is never silent.
- Confirmation is required before deletion.
- Only safe temporary folders are eligible for cleanup.
- Startup analysis is advisory only.
- CleanStart is not antivirus and does not detect malware.
- CleanStart does not collect personal data.
- CleanStart does not send data to external servers.
- Admin permissions are not required for normal MVP usage.

## Development

Run tests:

```powershell
pytest
```

Check Python syntax:

```powershell
python -m compileall core gui utils tests main.py
```

Format code:

```powershell
black .
```

## Roadmap

See [ROADMAP.md](ROADMAP.md).

Suggested repository topics:

```text
windows, python, pyqt6, cleanup, maintenance-tool, open-source, privacy-first
```

## Contributing

Contributions are welcome if they preserve the safety-first direction. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## Security

Please report safety or security concerns using the guidance in
[SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
