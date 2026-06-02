from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


@dataclass(frozen=True)
class LogEntry:
    timestamp: str
    action: str
    detail: str

    def render(self) -> str:
        return f"[{self.timestamp}] {self.action}: {self.detail}"


class ActivityLog:
    def __init__(self, log_path: Path | None = None):
        self.log_path = log_path or Path("logs") / "activity.log"
        self.entries: list[LogEntry] = []
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def add(self, action: str, detail: str) -> LogEntry:
        entry = LogEntry(datetime.now().strftime("%Y-%m-%d %H:%M:%S"), action, detail)
        self.entries.append(entry)
        with self.log_path.open("a", encoding="utf-8") as handle:
            handle.write(entry.render() + "\n")
        return entry

    def recent_text(self) -> str:
        if not self.entries:
            return "No activity yet."
        return "\n".join(entry.render() for entry in self.entries)
