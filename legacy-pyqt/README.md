# Legacy PyQt6 MVP

This folder preserves the CleanStart v0.1.0 PyQt6 implementation as a working
reference while the main project moves to Tauri + React + TypeScript +
Tailwind.

The files here are not deleted or rewritten because the old MVP still contains
the safety-first cleanup, startup analyzer, disk analyzer, logging, packaging,
and tests used for reference.

To run the legacy app from this folder:

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python main.py
```

The new v0.2.0 Tauri prototype in the repository root uses mock data only and
does not connect to this backend yet.
