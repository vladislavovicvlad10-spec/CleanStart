from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from core.temp_cleaner import ScanError, item_size


MAX_DEFAULT_ITEMS = 25000


@dataclass(frozen=True)
class DiskItem:
    path: Path
    size: int
    item_type: str


@dataclass(frozen=True)
class DiskScanResult:
    items: list[DiskItem]
    errors: list[ScanError]
    scanned_root: Path
    scanned_items: int
    stopped_early: bool


def default_profile_folders() -> list[Path]:
    home = Path.home()
    names = ("Downloads", "Desktop", "Documents", "Pictures", "Videos")
    return [home / name for name in names if (home / name).exists()]


def scan_largest_items(
    root: Path, max_items: int = MAX_DEFAULT_ITEMS, limit: int = 40
) -> DiskScanResult:
    root = root.expanduser()
    errors: list[ScanError] = []
    items: list[DiskItem] = []
    scanned_items = 0
    stopped_early = False

    try:
        resolved_root = root.resolve()
    except OSError as exc:
        return DiskScanResult([], [ScanError(root, str(exc))], root, 0, False)

    if not resolved_root.exists() or not resolved_root.is_dir():
        return DiskScanResult(
            [],
            [ScanError(resolved_root, "Folder does not exist.")],
            resolved_root,
            0,
            False,
        )

    try:
        children = list(resolved_root.iterdir())
    except OSError as exc:
        return DiskScanResult(
            [], [ScanError(resolved_root, str(exc))], resolved_root, 0, False
        )

    for child in children:
        if child.is_symlink():
            continue
        if scanned_items >= max_items:
            stopped_early = True
            break
        if child.is_file():
            try:
                size = child.stat().st_size
                scanned_items += 1
                items.append(DiskItem(child, size, "File"))
            except OSError as exc:
                errors.append(ScanError(child, str(exc)))
            continue
        if child.is_dir():
            size, count, child_errors = item_size(child)
            scanned_items += max(count, 1)
            if scanned_items > max_items:
                stopped_early = True
            errors.extend(child_errors[:25])
            items.append(DiskItem(child, size, "Folder"))

    items.sort(key=lambda item: item.size, reverse=True)
    return DiskScanResult(
        items[:limit], errors, resolved_root, scanned_items, stopped_early
    )


def scan_profile_summary(limit: int = 40) -> DiskScanResult:
    roots = default_profile_folders()
    errors: list[ScanError] = []
    items: list[DiskItem] = []
    scanned = 0
    stopped_early = False
    for root in roots:
        result = scan_largest_items(root, limit=limit)
        errors.extend(result.errors)
        items.extend(result.items)
        scanned += result.scanned_items
        stopped_early = stopped_early or result.stopped_early
    items.sort(key=lambda item: item.size, reverse=True)
    return DiskScanResult(items[:limit], errors, Path.home(), scanned, stopped_early)
