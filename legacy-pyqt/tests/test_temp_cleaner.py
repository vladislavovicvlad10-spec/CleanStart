from pathlib import Path

import core.temp_cleaner as temp_cleaner
from core.temp_cleaner import cleanup_temp_items, is_safe_temp_item, scan_temp_items


def test_scan_temp_items_lists_only_children(tmp_path: Path) -> None:
    root = tmp_path / "Temp"
    root.mkdir()
    file_path = root / "example.tmp"
    file_path.write_bytes(b"x" * 10)

    result = scan_temp_items([root])

    assert result.total_count == 1
    assert result.total_size == 10
    assert result.items[0].path == file_path


def test_cleanup_dry_run_does_not_delete(tmp_path: Path) -> None:
    root = tmp_path / "Temp"
    root.mkdir()
    file_path = root / "example.tmp"
    file_path.write_text("keep for preview", encoding="utf-8")

    result = cleanup_temp_items([file_path], roots=[root], dry_run=True)

    assert result.total_count == 1
    assert file_path.exists()


def test_cleanup_rejects_paths_outside_safe_roots(tmp_path: Path) -> None:
    root = tmp_path / "Temp"
    root.mkdir()
    outside = tmp_path / "Documents" / "important.txt"
    outside.parent.mkdir()
    outside.write_text("do not touch", encoding="utf-8")

    result = cleanup_temp_items([outside], roots=[root], dry_run=False)

    assert result.total_count == 0
    assert result.errors
    assert outside.exists()
    assert not is_safe_temp_item(outside, [root])


def test_cleanup_missing_file_returns_error(tmp_path: Path) -> None:
    root = tmp_path / "Temp"
    root.mkdir()
    missing = root / "missing.tmp"

    result = cleanup_temp_items([missing], roots=[root], dry_run=False)

    assert result.total_count == 0
    assert result.errors


def test_cleanup_recycle_bin_exception_returns_error(
    monkeypatch, tmp_path: Path
) -> None:
    root = tmp_path / "Temp"
    root.mkdir()
    file_path = root / "example.tmp"
    file_path.write_text("do not delete permanently", encoding="utf-8")

    def fail_send2trash(path: str) -> None:
        raise RuntimeError("Recycle Bin failed")

    monkeypatch.setattr(temp_cleaner, "send2trash", fail_send2trash)

    result = cleanup_temp_items(
        [file_path], roots=[root], dry_run=False, use_recycle_bin=True
    )

    assert result.total_count == 0
    assert result.errors
    assert "Recycle Bin failed" in result.errors[0].message
    assert file_path.exists()
