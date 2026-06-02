from __future__ import annotations

import traceback
from datetime import datetime
from pathlib import Path


LOG_PATH = Path("logs") / "cleanstart.log"


def log_exception(context: str, exc: BaseException) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(f"[{datetime.now().isoformat(timespec='seconds')}] {context}\n")
        handle.write(
            "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
        )
        handle.write("\n")
