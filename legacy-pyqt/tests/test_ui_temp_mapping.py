import os
from pathlib import Path

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PyQt6.QtWidgets import QApplication

from core.temp_cleaner import CleanupResult, ScanError, TempItem, TempScanResult
from main import CleanStartWindow


def test_selected_temp_paths_use_row_user_role() -> None:
    app = QApplication.instance() or QApplication([])
    window = CleanStartWindow()
    path = Path("C:/Temp/example.tmp")

    window.show_temp_result(
        TempScanResult(
            items=[TempItem(path=path, size=128, item_type="File", source="C:/Temp")],
            errors=[],
        )
    )
    window.temp_table.selectRow(0)

    assert window.selected_temp_paths() == [path]
    window.close()
    app.processEvents()


def test_cleanup_result_keeps_window_alive_and_failed_rows_visible() -> None:
    app = QApplication.instance() or QApplication([])
    window = CleanStartWindow()
    window.show()
    app.processEvents()
    removed_path = Path("C:/Temp/removed.tmp")
    failed_path = Path("C:/Temp/failed.tmp")
    messages: list[tuple[str, str]] = []
    window.show_readable_message = lambda title, message: messages.append(
        (title, message)
    )

    window.show_temp_result(
        TempScanResult(
            items=[
                TempItem(removed_path, 128, "File", "C:/Temp"),
                TempItem(failed_path, 256, "File", "C:/Temp"),
            ],
            errors=[],
        )
    )

    window._show_cleanup_result(
        CleanupResult(
            removed_items=[TempItem(removed_path, 128, "File", "C:/Temp")],
            errors=[ScanError(failed_path, "Permission denied")],
            dry_run=False,
        )
    )

    assert window.isVisible() is True
    assert window.temp_table.rowCount() == 1
    assert window.temp_table.item(0, 3).text() == str(failed_path)
    assert messages
    assert any(text in messages[-1][1] for text in ("Removed: 1", "Удалено: 1"))
    assert any(text in messages[-1][1] for text in ("Failed: 1", "Ошибок: 1"))
    window.close()
    app.processEvents()
