from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class StartupEntry:
    name: str
    command: str
    path: str
    source: str
    status: str
    label: str
    note: str


def _extract_path(command: str) -> str:
    text = command.strip()
    if not text:
        return ""
    quoted = re.match(r'^"([^"]+)"', text)
    if quoted:
        return quoted.group(1)
    executable = re.match(
        r"^(.+?\.(?:exe|bat|cmd|ps1|vbs|lnk))(\s|$)", text, re.IGNORECASE
    )
    if executable:
        return executable.group(1)
    parts = text.split()
    return parts[0] if parts else text


def _label_entry(name: str, command: str, executable: str) -> tuple[str, str]:
    combined = f"{name} {command}".lower()
    executable_lower = executable.lower()

    if not executable:
        return "Unknown", "No executable path could be parsed."
    if executable_lower.endswith(".lnk"):
        return "Unknown", "Shortcut target is not resolved in v0.1.0."
    if executable and not Path(executable).exists():
        return "Unknown", "The referenced path does not currently exist."
    if any(
        token in combined
        for token in ("updater", "update", "launcher", "helper", "tray")
    ):
        return (
            "Potentially unnecessary",
            "Often optional; review whether you need it at sign-in.",
        )
    if any(
        token in executable_lower
        for token in ("\\windows\\", "\\program files\\", "\\program files (x86)\\")
    ):
        return "Normal", "Located in a common application or Windows folder."
    return (
        "Unknown",
        "Not enough information to classify. This is not a malware verdict.",
    )


def _registry_entries() -> list[StartupEntry]:
    if os.name != "nt":
        return []

    import winreg

    locations = [
        (
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            "Registry HKCU Run",
        ),
        (
            winreg.HKEY_LOCAL_MACHINE,
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            "Registry HKLM Run",
        ),
        (
            winreg.HKEY_LOCAL_MACHINE,
            r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run",
            "Registry HKLM WOW6432 Run",
        ),
    ]
    entries: list[StartupEntry] = []
    for hive, subkey, source in locations:
        try:
            with winreg.OpenKey(hive, subkey) as key:
                index = 0
                while True:
                    try:
                        name, value, _ = winreg.EnumValue(key, index)
                    except OSError:
                        break
                    command = str(value)
                    executable = _extract_path(command)
                    label, note = _label_entry(name, command, executable)
                    entries.append(
                        StartupEntry(
                            name=name,
                            command=command,
                            path=executable,
                            source=source,
                            status="Enabled",
                            label=label,
                            note=note,
                        )
                    )
                    index += 1
        except OSError:
            continue
    return entries


def _startup_folder_entries() -> list[StartupEntry]:
    folders = []
    appdata = os.environ.get("APPDATA")
    programdata = os.environ.get("PROGRAMDATA")
    if appdata:
        folders.append(
            (
                Path(appdata) / r"Microsoft\Windows\Start Menu\Programs\Startup",
                "User Startup folder",
            )
        )
    if programdata:
        folders.append(
            (
                Path(programdata) / r"Microsoft\Windows\Start Menu\Programs\Startup",
                "All users Startup folder",
            )
        )

    entries: list[StartupEntry] = []
    for folder, source in folders:
        if not folder.exists():
            continue
        try:
            children = [child for child in folder.iterdir() if child.is_file()]
        except OSError:
            continue
        for child in children:
            label, note = _label_entry(child.stem, str(child), str(child))
            entries.append(
                StartupEntry(
                    name=child.stem,
                    command=str(child),
                    path=str(child),
                    source=source,
                    status="Enabled",
                    label=label,
                    note=note,
                )
            )
    return entries


def analyze_startup_entries() -> list[StartupEntry]:
    entries = _registry_entries() + _startup_folder_entries()
    entries.sort(key=lambda entry: (entry.label, entry.name.lower()))
    return entries
