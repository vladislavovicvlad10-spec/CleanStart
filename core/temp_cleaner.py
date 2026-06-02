from __future__ import annotations

import os
import shutil
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

try:
    from send2trash import send2trash
except ImportError:  # pragma: no cover - covered by fallback behavior
    send2trash = None


@dataclass(frozen=True)
class TempItem:
    path: Path
    size: int
    item_type: str
    source: str


@dataclass(frozen=True)
class ScanError:
    path: Path
    message: str


@dataclass(frozen=True)
class TempScanResult:
    items: list[TempItem] = field(default_factory=list)
    errors: list[ScanError] = field(default_factory=list)

    @property
    def total_size(self) -> int:
        return sum(item.size for item in self.items)

    @property
    def total_count(self) -> int:
        return len(self.items)


@dataclass(frozen=True)
class CleanupResult:
    removed_items: list[TempItem] = field(default_factory=list)
    errors: list[ScanError] = field(default_factory=list)
    dry_run: bool = True

    @property
    def total_size(self) -> int:
        return sum(item.size for item in self.removed_items)

    @property
    def total_count(self) -> int:
        return len(self.removed_items)


def get_safe_temp_roots() -> list[Path]:
    """Return user-scoped temporary folders only.

    The app intentionally avoids browser caches, Prefetch, Program Files, and broad
    Windows directories in v0.1.0.
    """
    candidates = [
        Path(tempfile.gettempdir()),
        Path(os.environ.get("TEMP", "")),
        Path(os.environ.get("TMP", "")),
    ]

    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        candidates.append(Path(local_app_data) / "Temp")

    roots: list[Path] = []
    seen: set[Path] = set()
    for candidate in candidates:
        if not str(candidate):
            continue
        try:
            resolved = candidate.expanduser().resolve()
        except OSError:
            continue
        if resolved.exists() and resolved.is_dir() and resolved not in seen:
            roots.append(resolved)
            seen.add(resolved)
    return roots


def is_path_inside(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except (ValueError, OSError):
        return False


def is_safe_temp_item(path: Path, roots: Iterable[Path]) -> bool:
    try:
        resolved = path.resolve()
    except OSError:
        return False
    for root in roots:
        try:
            resolved_root = root.resolve()
        except OSError:
            continue
        if resolved == resolved_root:
            return False
        if is_path_inside(resolved, resolved_root):
            return True
    return False


def item_size(path: Path) -> tuple[int, int, list[ScanError]]:
    errors: list[ScanError] = []
    if path.is_symlink():
        return 0, 0, [ScanError(path, "Symbolic links are skipped for safety.")]

    if path.is_file():
        try:
            return path.stat().st_size, 1, []
        except OSError as exc:
            return 0, 0, [ScanError(path, str(exc))]

    total_size = 0
    total_count = 0
    try:
        for child in path.rglob("*"):
            try:
                if child.is_symlink():
                    continue
                if child.is_file():
                    total_size += child.stat().st_size
                    total_count += 1
            except OSError as exc:
                errors.append(ScanError(child, str(exc)))
    except OSError as exc:
        errors.append(ScanError(path, str(exc)))
    return total_size, total_count, errors


def scan_temp_items(roots: Iterable[Path] | None = None) -> TempScanResult:
    safe_roots = list(roots or get_safe_temp_roots())
    items: list[TempItem] = []
    errors: list[ScanError] = []

    for root in safe_roots:
        try:
            children = list(root.iterdir())
        except OSError as exc:
            errors.append(ScanError(root, str(exc)))
            continue

        for child in children:
            if not is_safe_temp_item(child, safe_roots):
                continue
            size, count, child_errors = item_size(child)
            errors.extend(child_errors)
            if count == 0 and size == 0:
                continue
            item_type = "Folder" if child.is_dir() else "File"
            items.append(TempItem(child, size, item_type, str(root)))

    items.sort(key=lambda item: item.size, reverse=True)
    return TempScanResult(items=items, errors=errors)


def cleanup_temp_items(
    paths: Iterable[Path],
    roots: Iterable[Path] | None = None,
    dry_run: bool = True,
    use_recycle_bin: bool = True,
) -> CleanupResult:
    safe_roots = list(roots or get_safe_temp_roots())
    removed: list[TempItem] = []
    errors: list[ScanError] = []

    for raw_path in paths:
        path = Path(raw_path)
        if not is_safe_temp_item(path, safe_roots):
            errors.append(
                ScanError(
                    path, "Skipped because the path is outside allowed temp folders."
                )
            )
            continue

        if not path.exists():
            errors.append(ScanError(path, "Skipped because the path no longer exists."))
            continue

        size, _, item_errors = item_size(path)
        errors.extend(item_errors)
        item = TempItem(path, size, "Folder" if path.is_dir() else "File", "")

        if dry_run:
            removed.append(item)
            continue

        try:
            if use_recycle_bin and send2trash is None:
                errors.append(
                    ScanError(path, "Recycle Bin support is unavailable; skipped.")
                )
                continue
            if use_recycle_bin and send2trash is not None:
                send2trash(str(path))
            elif path.is_dir():
                shutil.rmtree(path)
            else:
                path.unlink()
            removed.append(item)
        except Exception as exc:
            errors.append(ScanError(path, str(exc)))

    return CleanupResult(removed_items=removed, errors=errors, dry_run=dry_run)
