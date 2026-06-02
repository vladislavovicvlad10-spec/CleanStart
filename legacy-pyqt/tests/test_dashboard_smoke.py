import os

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PyQt6.QtCore import QPoint, Qt
from PyQt6.QtTest import QTest
from PyQt6.QtWidgets import QApplication, QPushButton, QWidget

from main import CleanStartWindow, save_language


def _global_rect(root: QWidget, widget: QWidget):
    top_left = widget.mapTo(root, QPoint(0, 0))
    return widget.rect().translated(top_left)


def _assert_no_pair_overlaps(root: QWidget, widgets: list[QWidget]) -> None:
    visible_widgets = [widget for widget in widgets if widget.isVisible()]
    for index, first in enumerate(visible_widgets):
        first_rect = _global_rect(root, first)
        for second in visible_widgets[index + 1 :]:
            assert not first_rect.intersects(_global_rect(root, second))


def test_dashboard_is_interactive_and_stable_at_release_sizes() -> None:
    app = QApplication.instance() or QApplication([])
    save_language("en")
    window = CleanStartWindow()

    for width, height in ((1366, 768), (1600, 900)):
        window.resize(width, height)
        window.show()
        app.processEvents()

        assert window.tabs.currentIndex() == 0
        assert window.dashboard_page.isVisible()
        assert window.dashboard_temp_value.text() == "Not scanned yet"

        for index, button in enumerate(window.navbar.buttons):
            QTest.mouseClick(
                button, Qt.MouseButton.LeftButton, pos=button.rect().center()
            )
            app.processEvents()
            assert window.tabs.currentIndex() == index
            assert button.isChecked()

        window.navigate_to_page(0)
        app.processEvents()

        for tile in window.quick_action_tiles:
            assert isinstance(tile, QPushButton)
            assert tile.isEnabled()

        QTest.mouseClick(
            window.quick_action_tiles[-1],
            Qt.MouseButton.LeftButton,
            pos=window.quick_action_tiles[-1].rect().center(),
        )
        app.processEvents()
        assert window.tabs.currentIndex() == 4
        window.navigate_to_page(0)
        app.processEvents()

        before = window.dashboard_recycle_toggle.isChecked()
        QTest.mouseClick(
            window.dashboard_recycle_toggle,
            Qt.MouseButton.LeftButton,
            pos=window.dashboard_recycle_toggle.rect().center(),
        )
        app.processEvents()
        assert window.dashboard_recycle_toggle.isChecked() != before
        assert (
            window.recycle_check.isChecked()
            == window.dashboard_recycle_toggle.isChecked()
        )

        _assert_no_pair_overlaps(
            window,
            [
                window.hero_illustration,
                *window.dashboard_cards.values(),
                window.quick_actions_panel,
                window.recent_activity_panel,
                window.dashboard_status_bar,
            ],
        )
        _assert_no_pair_overlaps(window, list(window.dashboard_cards.values()))
        _assert_no_pair_overlaps(
            window, [*window.quick_action_tiles, window.quick_safety_banner]
        )
        _assert_no_pair_overlaps(window, window.recent_activity_rows)

    window.close()
    app.processEvents()
