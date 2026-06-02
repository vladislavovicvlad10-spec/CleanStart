from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Callable

from PyQt6.QtCore import Qt, QThread, pyqtSignal
from PyQt6.QtGui import QColor
from PyQt6.QtWidgets import (
    QApplication,
    QCheckBox,
    QComboBox,
    QDialog,
    QFileDialog,
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QSizePolicy,
    QStackedWidget,
    QTableWidget,
    QTableWidgetItem,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from core.activity_log import ActivityLog
from core.disk_analyzer import DiskScanResult, scan_largest_items, scan_profile_summary
from core.startup_analyzer import StartupEntry, analyze_startup_entries
from core.temp_cleaner import (
    CleanupResult,
    TempItem,
    TempScanResult,
    cleanup_temp_items,
    scan_temp_items,
)
from gui.dashboard import (
    AppShell,
    BottomStatusBar,
    GlassCard,
    GradientButton,
    HeroIllustration,
    IconBadge,
    QuickActionTile,
    RecentActivityRow,
    SafetyBanner,
    SummaryCard,
    ToggleSwitch,
    TopNavBar,
)
from utils.formatting import format_size, truncate_middle
from utils.crash_log import log_exception
from utils.i18n import DEFAULT_LANGUAGE, LANGUAGE_LABELS, translate


VERSION = "0.1.0"
CONFIG_PATH = Path("config") / "settings.json"


def load_language() -> str:
    try:
        with CONFIG_PATH.open("r", encoding="utf-8") as handle:
            value = json.load(handle).get("language", DEFAULT_LANGUAGE)
            return value if value in LANGUAGE_LABELS else DEFAULT_LANGUAGE
    except (OSError, json.JSONDecodeError):
        return DEFAULT_LANGUAGE


def save_language(language: str) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CONFIG_PATH.open("w", encoding="utf-8") as handle:
        json.dump({"language": language}, handle, indent=2)


class Worker(QThread):
    finished_ok = pyqtSignal(object)
    failed = pyqtSignal(str)

    def __init__(self, task: Callable[[], object]):
        super().__init__()
        self.task = task

    def run(self) -> None:
        try:
            self.finished_ok.emit(self.task())
        except Exception as exc:  # pragma: no cover - UI safety net
            log_exception("Worker task failed", exc)
            self.failed.emit(str(exc))


class CleanupConfirmDialog(QDialog):
    def __init__(
        self,
        language: str,
        selected_count: int,
        selected_size: str,
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self.language = language
        self.confirmed = False
        self.setWindowTitle(self.t("confirm_cleanup_title"))
        self.setModal(True)
        self.setMinimumWidth(460)
        self.setStyleSheet(
            """
            QDialog {
                background: #ffffff;
                color: #172033;
            }
            QLabel {
                color: #172033;
                background: transparent;
                font-family: "Segoe UI";
                font-size: 13px;
            }
            QLabel[role="title"] {
                color: #111827;
                font-size: 20px;
                font-weight: 800;
            }
            QLabel[role="muted"] {
                color: #4b5f78;
            }
            QLabel[role="notice"] {
                background: #fff7ed;
                border: 1px solid #fdba74;
                border-radius: 8px;
                color: #7c2d12;
                padding: 10px 12px;
            }
            QGroupBox {
                background: #f8fafc;
                border: 1px solid #d8e0eb;
                border-radius: 8px;
                margin-top: 10px;
                padding: 14px;
                color: #111827;
                font-weight: 800;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 6px;
            }
            QPushButton {
                border-radius: 7px;
                padding: 9px 15px;
                font-weight: 700;
                min-width: 110px;
            }
            QPushButton[variant="secondary"] {
                background: #ffffff;
                color: #1f2937;
                border: 1px solid #cbd5e1;
            }
            QPushButton[variant="danger"] {
                background: #c2410c;
                color: #ffffff;
                border: 1px solid #c2410c;
            }
            QPushButton[variant="danger"]:hover {
                background: #9a3412;
                border-color: #9a3412;
            }
            """
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 18, 20, 18)
        layout.setSpacing(12)

        title = QLabel(self.t("confirm_cleanup_title"))
        title.setProperty("role", "title")
        message = QLabel(self.t("cleanup_dialog_message"))
        message.setProperty("role", "muted")
        message.setWordWrap(True)

        details = QGroupBox(self.t("clean_selected"))
        details_layout = QGridLayout(details)
        details_layout.addWidget(QLabel(self.t("item_count")), 0, 0)
        details_layout.addWidget(QLabel(str(selected_count)), 0, 1)
        details_layout.addWidget(QLabel(self.t("estimated_size")), 1, 0)
        details_layout.addWidget(QLabel(selected_size), 1, 1)

        note = QLabel(self.t("cleanup_dialog_note"))
        note.setProperty("role", "notice")
        note.setWordWrap(True)

        buttons = QHBoxLayout()
        buttons.addStretch()
        cancel_button = QPushButton(self.t("cancel"))
        cancel_button.setProperty("variant", "secondary")
        cancel_button.setDefault(True)
        cancel_button.clicked.connect(self.reject)
        clean_button = QPushButton(self.t("clean_selected"))
        clean_button.setProperty("variant", "danger")
        clean_button.clicked.connect(self.accept_cleanup)
        buttons.addWidget(cancel_button)
        buttons.addWidget(clean_button)

        layout.addWidget(title)
        layout.addWidget(message)
        layout.addWidget(details)
        layout.addWidget(note)
        layout.addLayout(buttons)

    def t(self, key: str, **kwargs: object) -> str:
        return translate(self.language, key, **kwargs)

    def accept_cleanup(self) -> None:
        self.confirmed = True
        self.accept()


class CleanStartWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.language = load_language()
        self.setWindowTitle(self.t("app_window_title", version=VERSION))
        self.setMinimumSize(1180, 760)
        self.resize(1380, 860)

        self.activity = ActivityLog()
        self.temp_result: TempScanResult | None = None
        self.temp_items_by_path: dict[str, TempItem] = {}
        self.worker: Worker | None = None
        self.action_buttons: list[QPushButton] = []
        self.dashboard_cards: dict[str, SummaryCard] = {}
        self.recent_activity_rows: list[RecentActivityRow] = []
        self.quick_action_tiles: list[QuickActionTile] = []

        self.last_temp_status = self.t("not_scanned_yet")
        self.last_startup_status = self.t("not_scanned_yet")
        self.last_disk_status = self.t("not_scanned_yet")
        self.last_log_status = self.t("not_scanned_yet")
        self.last_startup_count = 0
        self.last_disk_count = 0
        self.last_disk_root = self.t("not_scanned_yet")

        self._setup_style()
        self._build_ui()
        self.refresh_dashboard()

    def t(self, key: str, **kwargs: object) -> str:
        return translate(self.language, key, **kwargs)

    def _setup_style(self) -> None:
        self.setStyleSheet(
            """
            QMainWindow {
                background: #f4f6f9;
                color: #172033;
            }
            QWidget {
                color: #172033;
                font-family: "Segoe UI";
                font-size: 13px;
            }
            QLabel {
                color: #172033;
                background: transparent;
            }
            QLabel[role="muted"] {
                color: #5f6f85;
            }
            QLabel[role="title"] {
                color: #111827;
                font-size: 28px;
                font-weight: 800;
            }
            QLabel[role="sectionTitle"] {
                color: #111827;
                font-size: 20px;
                font-weight: 800;
            }
            QLabel[role="stat"] {
                color: #0f172a;
                font-size: 22px;
                font-weight: 800;
            }
            QLabel[role="notice"] {
                background: #fff7ed;
                border: 1px solid #fdba74;
                border-radius: 8px;
                color: #7c2d12;
                padding: 10px 12px;
            }
            QLabel[role="chip"] {
                background: #eef2f7;
                border: 1px solid #d7dee9;
                border-radius: 12px;
                color: #253244;
                padding: 4px 10px;
                font-weight: 700;
            }
            QTabWidget::pane {
                border: 1px solid #d8e0eb;
                background: #ffffff;
                border-radius: 10px;
                top: -1px;
            }
            QTabBar::tab {
                background: #e8edf5;
                color: #27364a;
                border: 1px solid #cbd5e1;
                padding: 11px 18px;
                margin-right: 5px;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
                font-weight: 700;
                min-width: 118px;
            }
            QTabBar::tab:hover {
                background: #f1f5f9;
                color: #111827;
            }
            QTabBar::tab:selected {
                background: #ffffff;
                color: #0b4db3;
                border-color: #9db7dd;
                border-bottom-color: #ffffff;
            }
            QPushButton {
                background: #1f6feb;
                color: #ffffff;
                border: 1px solid #1f6feb;
                border-radius: 7px;
                padding: 9px 15px;
                font-weight: 700;
                min-height: 18px;
            }
            QPushButton:hover {
                background: #185ec8;
                border-color: #185ec8;
            }
            QPushButton:pressed {
                background: #124a9c;
                border-color: #124a9c;
            }
            QPushButton:disabled {
                background: #aeb8c8;
                border-color: #aeb8c8;
                color: #eef2f7;
            }
            QPushButton[variant="secondary"] {
                background: #ffffff;
                color: #1f2937;
                border: 1px solid #cbd5e1;
            }
            QPushButton[variant="secondary"]:hover {
                background: #f1f5f9;
                border-color: #94a3b8;
            }
            QPushButton[variant="danger"] {
                background: #c2410c;
                color: #ffffff;
                border-color: #c2410c;
            }
            QPushButton[variant="danger"]:hover {
                background: #9a3412;
                border-color: #9a3412;
            }
            QGroupBox {
                background: #f8fafc;
                border: 1px solid #d8e0eb;
                border-radius: 9px;
                margin-top: 14px;
                padding: 16px 14px 14px 14px;
                font-size: 14px;
                font-weight: 800;
                color: #111827;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 12px;
                padding: 0 7px;
            }
            QTableWidget {
                background: #ffffff;
                alternate-background-color: #f8fafc;
                color: #172033;
                border: 1px solid #d8e0eb;
                border-radius: 8px;
                gridline-color: #e8edf5;
                selection-background-color: #dbeafe;
                selection-color: #0f172a;
            }
            QTableWidget::item {
                color: #172033;
                padding: 6px;
            }
            QTableWidget::item:selected {
                color: #0f172a;
                background: #dbeafe;
            }
            QHeaderView::section {
                background: #eef2f7;
                color: #243244;
                padding: 9px 8px;
                border: 0;
                border-right: 1px solid #d8e0eb;
                border-bottom: 1px solid #d8e0eb;
                font-weight: 800;
            }
            QTextEdit {
                background: #111827;
                color: #e5edf7;
                border: 1px solid #1f2937;
                border-radius: 8px;
                padding: 12px;
                font-family: Consolas, "Courier New", monospace;
                font-size: 12px;
                line-height: 1.35;
            }
            QCheckBox {
                color: #253244;
                spacing: 8px;
            }
            """
        )

    def _build_ui(self) -> None:
        self.action_buttons = []
        root = AppShell(Path("assets") / "dashboard" / "background.png")
        layout = QVBoxLayout(root)
        layout.setContentsMargins(26, 22, 26, 22)
        layout.setSpacing(18)

        self.tabs = QStackedWidget()
        self.navbar = TopNavBar(self.navigate_to_page)
        self.tabs.currentChanged.connect(self.navbar.set_active)

        self.dashboard_page = self._dashboard_tab()
        self.temp_page = self._temp_tab()
        self.startup_page = self._startup_tab()
        self.disk_page = self._disk_tab()
        self.log_page = self._log_tab()
        self.about_page = self._about_tab()

        for page in (
            self.dashboard_page,
            self.temp_page,
            self.startup_page,
            self.disk_page,
            self.log_page,
            self.about_page,
        ):
            self.tabs.addWidget(page)

        layout.addWidget(self.navbar)
        layout.addWidget(self.tabs, 1)
        self.setCentralWidget(root)

    def navigate_to_page(self, index: int) -> None:
        if 0 <= index < self.tabs.count():
            self.tabs.setCurrentIndex(index)

    def _dashboard_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setContentsMargins(18, 2, 18, 0)
        layout.setSpacing(12)

        hero = QHBoxLayout()
        hero.setSpacing(12)
        hero_copy = QVBoxLayout()
        hero_copy.setContentsMargins(28, 28, 0, 0)
        hero_copy.setSpacing(10)
        headline = QLabel("Keep your PC clean,\nfast, and running at its best.")
        headline.setStyleSheet(
            "color: #07143d; font-size: 36px; font-weight: 900; line-height: 1.10;"
        )
        subtitle = QLabel(
            "Safety-first Windows maintenance. Preview first, confirm always."
        )
        subtitle.setStyleSheet("color: #42577a; font-size: 16px; font-weight: 600;")
        hero_copy.addWidget(headline)
        hero_copy.addWidget(subtitle)
        self.hero_safety_banner = SafetyBanner(
            "CleanStart is an advisor and cleanup helper.",
            "It does not replace antivirus and does not detect malware.",
        )
        hero_copy.addWidget(self.hero_safety_banner)
        hero_copy.addStretch(1)
        hero.addLayout(hero_copy, 1)
        self.hero_illustration = HeroIllustration(
            Path("assets") / "dashboard" / "hero_illustration.png"
        )
        hero.addWidget(self.hero_illustration, 1)
        layout.addLayout(hero)

        card_row = QHBoxLayout()
        card_row.setSpacing(13)
        self.dashboard_cards["temp"] = SummaryCard(
            "Temp Cleaner",
            "Review and clean temporary files",
            "drop",
            "blue",
            "Items found",
            "Total size",
            "Review now",
            self.preview_temp,
        )
        self.dashboard_cards["startup"] = SummaryCard(
            "Startup Analyzer",
            "Analyze startup entries and performance impact",
            "rocket",
            "purple",
            "Entries found",
            "Changes made",
            "Analyze startup",
            self.analyze_startup,
        )
        self.dashboard_cards["disk"] = SummaryCard(
            "Disk Analyzer",
            "View disk usage and large files",
            "chart",
            "orange",
            "Items shown",
            "Last scan",
            "Analyze disk",
            self.scan_profile_disk,
        )
        self.dashboard_cards["log"] = SummaryCard(
            "Activity Log",
            "Review recent scans and actions",
            "list",
            "green",
            "Entries",
            "Latest activity",
            "Open log",
            lambda: self.navigate_to_page(4),
        )
        self.dashboard_cards["settings"] = SummaryCard(
            "Settings",
            "Configure CleanStart and preferences",
            "gear",
            "soft",
            "Version",
            "Privacy",
            "Open settings",
            lambda: self.navigate_to_page(5),
        )
        self.dashboard_temp_value = self.dashboard_cards["temp"].status_value
        self.dashboard_startup_value = self.dashboard_cards["startup"].status_value
        self.dashboard_disk_value = self.dashboard_cards["disk"].status_value
        self.dashboard_log_value = self.dashboard_cards["log"].status_value
        for card in self.dashboard_cards.values():
            card_row.addWidget(card)
        layout.addLayout(card_row)

        lower = QHBoxLayout()
        lower.setSpacing(17)
        self.quick_actions_panel = self._quick_actions_panel()
        self.recent_activity_panel = self._recent_activity_panel()
        lower.addWidget(self.quick_actions_panel, 1)
        lower.addWidget(self.recent_activity_panel, 1)
        layout.addLayout(lower, 1)

        self.dashboard_recycle_toggle = ToggleSwitch(True)
        self.dashboard_recycle_toggle.toggled.connect(self.set_recycle_bin_preference)
        self.dashboard_status_bar = BottomStatusBar(self.dashboard_recycle_toggle)
        layout.addWidget(self.dashboard_status_bar)
        return tab

    def _quick_actions_panel(self) -> GlassCard:
        panel = GlassCard(radius=24)
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(20, 17, 20, 17)
        layout.setSpacing(13)
        title = QHBoxLayout()
        title.addWidget(IconBadge("flash", "blue", 34))
        heading = QLabel("Quick actions")
        heading.setStyleSheet("color: #07143d; font-size: 18px; font-weight: 900;")
        title.addWidget(heading)
        title.addStretch()
        layout.addLayout(title)
        actions = QHBoxLayout()
        actions.setSpacing(13)
        self.quick_action_tiles = [
            QuickActionTile(
                "Preview temp files", "document", "blue", self.preview_temp
            ),
            QuickActionTile(
                "Analyze startup", "rocket", "purple", self.analyze_startup
            ),
            QuickActionTile(
                "Scan profile folders", "folder", "blue", self.scan_profile_disk
            ),
            QuickActionTile(
                "Open activity log", "list", "green", lambda: self.navigate_to_page(4)
            ),
        ]
        for tile in self.quick_action_tiles:
            actions.addWidget(tile)
        layout.addLayout(actions)
        self.quick_safety_banner = SafetyBanner(
            "Review before deleting. Cleanup uses Recycle Bin when supported.",
            "You're in control: preview, confirm, always.",
        )
        layout.addWidget(self.quick_safety_banner)
        return panel

    def _recent_activity_panel(self) -> GlassCard:
        panel = GlassCard(radius=24)
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(20, 17, 20, 17)
        layout.setSpacing(10)
        header = QHBoxLayout()
        header.addWidget(IconBadge("activity", "blue", 34))
        title = QLabel("Recent activity")
        title.setStyleSheet("color: #07143d; font-size: 18px; font-weight: 900;")
        header.addWidget(title)
        header.addStretch()
        header.addWidget(
            GradientButton("View all", "soft", lambda: self.navigate_to_page(4))
        )
        layout.addLayout(header)
        self.recent_activity_layout = QVBoxLayout()
        self.recent_activity_layout.setSpacing(1)
        layout.addLayout(self.recent_activity_layout)
        self.rebuild_recent_activity()
        return panel

    def _temp_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setContentsMargins(18, 18, 18, 18)
        layout.setSpacing(12)

        layout.addWidget(self._label(self.t("temp_cleaner"), role="sectionTitle"))
        layout.addWidget(self._notice(self.t("temp_notice")))

        summary = QGridLayout()
        summary.setSpacing(12)
        self.temp_items_stat = self._summary_tile(
            summary, 0, 0, self.t("items_found"), "0"
        )
        self.temp_size_stat = self._summary_tile(
            summary, 0, 1, self.t("total_size"), "0 B"
        )
        self.temp_time_stat = self._summary_tile(
            summary, 0, 2, self.t("last_scan"), self.t("not_scanned_yet")
        )
        layout.addLayout(summary)

        actions = QHBoxLayout()
        actions.setSpacing(9)
        self.preview_temp_button = self._button(
            self.t("preview_safe_temp"), self.preview_temp
        )
        self.dry_run_button = self._button(
            self.t("dry_run_selected"), self.dry_run_temp, variant="secondary"
        )
        self.clean_temp_button = self._button(
            self.t("clean_selected"), self.clean_temp, variant="danger"
        )
        self.select_all_temp_button = self._button(
            self.t("select_all"),
            lambda: self.temp_table.selectAll(),
            variant="secondary",
        )
        self.recycle_check = QCheckBox(self.t("recycle_bin"))
        self.recycle_check.setChecked(True)
        if hasattr(self, "dashboard_recycle_toggle"):
            self.recycle_check.setChecked(self.dashboard_recycle_toggle.isChecked())
            self.recycle_check.toggled.connect(self.dashboard_recycle_toggle.setChecked)
        actions.addWidget(self.preview_temp_button)
        actions.addWidget(self.dry_run_button)
        actions.addWidget(self.clean_temp_button)
        actions.addWidget(self.select_all_temp_button)
        actions.addStretch()
        actions.addWidget(self.recycle_check)
        layout.addLayout(actions)

        self.temp_summary = self._muted(self.t("no_preview"))
        self.temp_table = self._table(
            [
                self.t("table_header_type"),
                self.t("table_header_size"),
                self.t("table_header_source"),
                self.t("table_header_path"),
            ],
            stretch_column=3,
        )
        self._show_empty_table(self.temp_table, self.t("temp_empty"))
        layout.addWidget(self.temp_summary)
        layout.addWidget(self.temp_table, 1)
        return tab

    def _startup_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setContentsMargins(18, 18, 18, 18)
        layout.setSpacing(12)

        layout.addWidget(self._label(self.t("startup_analyzer"), role="sectionTitle"))
        layout.addWidget(self._notice(self.t("advisory_only_notice")))

        summary_row = QHBoxLayout()
        self.startup_entries_stat = self._inline_stat(self.t("entries_found"), "0")
        self.startup_change_stat = self._inline_stat(self.t("changes_made"), "0")
        summary_row.addWidget(self.startup_entries_stat)
        summary_row.addWidget(self.startup_change_stat)
        summary_row.addStretch()
        layout.addLayout(summary_row)

        labels = QHBoxLayout()
        labels.addWidget(self._chip(self.t("normal")))
        labels.addWidget(self._chip(self.t("unknown")))
        labels.addWidget(self._chip(self.t("potentially_unnecessary")))
        labels.addStretch()
        labels.addWidget(self._button(self.t("analyze_startup"), self.analyze_startup))
        layout.addLayout(labels)

        self.startup_summary = self._muted(self.t("startup_no_scan"))
        self.startup_table = self._table(
            [
                self.t("table_header_label"),
                self.t("table_header_name"),
                self.t("table_header_status"),
                self.t("table_header_source"),
                self.t("table_header_path"),
                self.t("table_header_note"),
            ],
            stretch_column=4,
        )
        self._show_empty_table(self.startup_table, self.t("startup_empty"))
        layout.addWidget(self.startup_summary)
        layout.addWidget(self.startup_table, 1)
        return tab

    def _disk_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setContentsMargins(18, 18, 18, 18)
        layout.setSpacing(12)

        layout.addWidget(self._label(self.t("disk_analyzer_lite"), role="sectionTitle"))
        layout.addWidget(self._notice(self.t("disk_notice")))

        summary = QGridLayout()
        summary.setSpacing(12)
        self.disk_folder_stat = self._summary_tile(
            summary, 0, 0, self.t("folder_scanned"), self.t("not_scanned_yet")
        )
        self.disk_reviewed_stat = self._summary_tile(
            summary, 0, 1, self.t("disk_reviewed"), "0"
        )
        self.disk_shown_stat = self._summary_tile(
            summary, 0, 2, self.t("disk_largest_items"), "0"
        )
        layout.addLayout(summary)

        actions = QHBoxLayout()
        self.profile_scan_button = self._button(
            self.t("scan_profile_folders"), self.scan_profile_disk
        )
        self.choose_folder_button = self._button(
            self.t("choose_folder"), self.choose_disk_folder, variant="secondary"
        )
        actions.addWidget(self.profile_scan_button)
        actions.addWidget(self.choose_folder_button)
        actions.addStretch()
        layout.addLayout(actions)

        self.disk_summary = self._muted(self.t("disk_no_scan"))
        self.disk_table = self._table(
            [
                self.t("table_header_type"),
                self.t("table_header_size"),
                self.t("table_header_path"),
            ],
            stretch_column=2,
        )
        self._show_empty_table(self.disk_table, self.t("disk_empty"))
        layout.addWidget(self.disk_summary)
        layout.addWidget(self.disk_table, 1)
        return tab

    def _log_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setContentsMargins(18, 18, 18, 18)
        layout.setSpacing(12)

        header = QHBoxLayout()
        header.addWidget(self._label(self.t("activity_log"), role="sectionTitle"))
        header.addStretch()
        header.addWidget(
            self._button(self.t("copy_log"), self.copy_log, variant="secondary")
        )
        header.addWidget(
            self._button(
                self.t("clear_visible_log"), self.clear_visible_log, variant="secondary"
            )
        )
        layout.addLayout(header)
        layout.addWidget(self._muted(self.t("activity_log_local_note")))

        self.log_view = QTextEdit()
        self.log_view.setReadOnly(True)
        self.log_view.setPlaceholderText(self.t("log_empty"))
        layout.addWidget(self.log_view, 1)
        return tab

    def _about_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setContentsMargins(18, 18, 18, 18)
        layout.setSpacing(12)

        layout.addWidget(self._label(self.t("settings_about"), role="sectionTitle"))

        language_card = self._card(self.t("language"))
        language_layout = QHBoxLayout(language_card)
        language_layout.addWidget(self._muted(self.t("language")))
        self.language_selector = QComboBox()
        self.language_selector.addItem(self.t("english"), "en")
        self.language_selector.addItem(self.t("russian"), "ru")
        selected_index = self.language_selector.findData(self.language)
        self.language_selector.setCurrentIndex(max(selected_index, 0))
        language_layout.addWidget(self.language_selector)
        language_layout.addWidget(
            self._button(
                self.t("apply_language"),
                self.apply_language_selection,
                variant="secondary",
            )
        )
        language_layout.addStretch()
        layout.addWidget(language_card)

        cards = QGridLayout()
        cards.setSpacing(12)
        self._info_card(cards, 0, 0, self.t("version"), f"CleanStart v{VERSION}")
        self._info_card(
            cards,
            0,
            1,
            self.t("safety_principles"),
            self.t("safety_principles_body"),
        )
        self._info_card(
            cards,
            1,
            0,
            self.t("privacy"),
            self.t("privacy_body"),
        )
        self._info_card(
            cards,
            1,
            1,
            self.t("limitations"),
            self.t("limitations_body"),
        )
        self._info_card(
            cards,
            2,
            0,
            self.t("roadmap"),
            self.t("roadmap_body"),
        )
        cards.setColumnStretch(0, 1)
        cards.setColumnStretch(1, 1)
        layout.addLayout(cards)
        layout.addStretch()
        return tab

    def _label(self, text: str, role: str | None = None) -> QLabel:
        label = QLabel(text)
        if role:
            label.setProperty("role", role)
        label.setWordWrap(True)
        return label

    def _muted(self, text: str) -> QLabel:
        label = self._label(text, role="muted")
        return label

    def _notice(self, text: str) -> QLabel:
        return self._label(text, role="notice")

    def _chip(self, text: str) -> QLabel:
        label = self._label(text, role="chip")
        label.setWordWrap(False)
        return label

    def _button(
        self, text: str, callback: Callable[[], None], variant: str | None = None
    ) -> QPushButton:
        button = QPushButton(text)
        if variant:
            button.setProperty("variant", variant)
        button.clicked.connect(callback)
        self.action_buttons.append(button)
        return button

    def _card(self, title: str) -> QGroupBox:
        card = QGroupBox(title)
        card.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Preferred)
        return card

    def _status_card(
        self, grid: QGridLayout, row: int, column: int, title: str, value: str
    ) -> QLabel:
        card = self._card(title)
        layout = QVBoxLayout(card)
        value_label = self._muted(value)
        layout.addWidget(value_label)
        grid.addWidget(card, row, column)
        return value_label

    def _summary_tile(
        self, grid: QGridLayout, row: int, column: int, title: str, value: str
    ) -> QLabel:
        card = self._card(title)
        layout = QVBoxLayout(card)
        value_label = self._label(value, role="stat")
        layout.addWidget(value_label)
        grid.addWidget(card, row, column)
        return value_label

    def _inline_stat(self, title: str, value: str) -> QGroupBox:
        card = self._card(title)
        layout = QVBoxLayout(card)
        label = self._label(value, role="stat")
        card.value_label = label  # type: ignore[attr-defined]
        layout.addWidget(label)
        return card

    def _info_card(
        self, grid: QGridLayout, row: int, column: int, title: str, body: str
    ) -> None:
        card = self._card(title)
        layout = QVBoxLayout(card)
        text = self._muted(body)
        layout.addWidget(text)
        grid.addWidget(card, row, column)

    def _table(self, columns: list[str], stretch_column: int) -> QTableWidget:
        table = QTableWidget(0, len(columns))
        table.setHorizontalHeaderLabels(columns)
        table.setAlternatingRowColors(True)
        table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        table.setSelectionMode(QTableWidget.SelectionMode.ExtendedSelection)
        table.verticalHeader().setVisible(False)
        table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        table.setWordWrap(False)
        table.setShowGrid(True)
        table.setSortingEnabled(False)
        table.verticalHeader().setDefaultSectionSize(36)
        table.setMinimumHeight(260)
        header = table.horizontalHeader()
        header.setMinimumSectionSize(90)
        for index in range(len(columns)):
            header.setSectionResizeMode(index, QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(stretch_column, QHeaderView.ResizeMode.Stretch)
        return table

    def _reset_table(self, table: QTableWidget) -> None:
        table.clearSpans()
        table.setRowCount(0)

    def _table_item(self, text: str, muted: bool = False) -> QTableWidgetItem:
        item = QTableWidgetItem(text)
        item.setForeground(QColor("#5f6f85" if muted else "#172033"))
        item.setToolTip(text)
        return item

    def _show_empty_table(self, table: QTableWidget, message: str) -> None:
        self._reset_table(table)
        table.insertRow(0)
        table.setSpan(0, 0, 1, table.columnCount())
        item = self._table_item(message, muted=True)
        item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
        table.setItem(0, 0, item)
        table.setRowHeight(0, 44)

    def log(self, action: str, detail: str) -> None:
        entry = self.activity.add(action, detail)
        if hasattr(self, "log_view"):
            self.log_view.append(entry.render())
        self.last_log_status = f"{action}: {detail}"
        if hasattr(self, "dashboard_log_value"):
            self.refresh_dashboard()

    def refresh_dashboard(self) -> None:
        self.dashboard_temp_value.setText(self.last_temp_status)
        self.dashboard_startup_value.setText(self.last_startup_status)
        self.dashboard_disk_value.setText(self.last_disk_status)
        self.dashboard_log_value.setText(truncate_middle(self.last_log_status, 86))
        if self.dashboard_cards:
            temp_card = self.dashboard_cards["temp"]
            if self.temp_result:
                temp_card.primary_value.setText(str(self.temp_result.total_count))
                temp_card.secondary_value.setText(
                    format_size(self.temp_result.total_size)
                )
            else:
                temp_card.primary_value.setText("0")
                temp_card.secondary_value.setText("Pending")
            temp_card.status_value.setText(self.last_temp_status)

            startup_card = self.dashboard_cards["startup"]
            startup_card.primary_value.setText(str(self.last_startup_count))
            startup_card.secondary_value.setText(self.t("status_changes_zero"))
            startup_card.status_value.setText(self.last_startup_status)

            disk_card = self.dashboard_cards["disk"]
            disk_card.primary_value.setText(str(self.last_disk_count))
            disk_card.secondary_value.setText(
                "Pending"
                if self.last_disk_root == self.t("not_scanned_yet")
                else truncate_middle(self.last_disk_root, 18)
            )
            disk_card.status_value.setText(self.last_disk_status)

            log_card = self.dashboard_cards["log"]
            log_card.primary_value.setText(str(len(self.activity.entries)))
            log_card.secondary_value.setText("Local only")
            log_card.status_value.setText(truncate_middle(self.last_log_status, 48))

            settings_card = self.dashboard_cards["settings"]
            settings_card.primary_value.setText(f"v{VERSION}")
            settings_card.secondary_value.setText("Local only")
            settings_card.status_value.setText("No telemetry")

        if hasattr(self, "dashboard_status_bar"):
            last_scan = self.t("not_scanned_yet")
            if self.activity.entries:
                last_scan = self.activity.entries[-1].timestamp.split(" ", 1)[-1]
            self.dashboard_status_bar.last_scan.setText(f"Last scan: {last_scan}")

        if hasattr(self, "recent_activity_layout"):
            self.rebuild_recent_activity()

    def set_recycle_bin_preference(self, checked: bool) -> None:
        if hasattr(self, "recycle_check"):
            self.recycle_check.setChecked(checked)

    def rebuild_recent_activity(self) -> None:
        while self.recent_activity_layout.count():
            item = self.recent_activity_layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

        entries = self.activity.entries[-5:]
        if not entries:
            rows = [
                (
                    "CleanStart started",
                    "Dashboard loaded. No scans have been run yet.",
                    "Now",
                    "shield",
                    "green",
                ),
                (
                    "Temp Cleaner ready",
                    "Preview safe temp files before deleting.",
                    "Ready",
                    "drop",
                    "blue",
                ),
                (
                    "Startup Analyzer ready",
                    "Read-only advisory mode. No changes made.",
                    "Ready",
                    "rocket",
                    "purple",
                ),
                (
                    "Disk Analyzer ready",
                    "Scan profile folders or one selected folder.",
                    "Ready",
                    "chart",
                    "orange",
                ),
                (
                    "Activity Log local only",
                    "No telemetry, upload, account, or cloud sync.",
                    "Local",
                    "list",
                    "green",
                ),
            ]
        else:
            rows = [
                (
                    entry.action,
                    truncate_middle(entry.detail, 74),
                    entry.timestamp.split(" ", 1)[-1],
                    self._activity_icon(entry.action),
                    self._activity_accent(entry.action),
                )
                for entry in reversed(entries)
            ]

        self.recent_activity_rows = []
        for title, detail, time_text, icon, accent in rows:
            row = RecentActivityRow(title, detail, time_text, icon, accent)
            self.recent_activity_rows.append(row)
            self.recent_activity_layout.addWidget(row)

    def _activity_icon(self, action: str) -> str:
        lowered = action.lower()
        if "temp" in lowered or "cleanup" in lowered:
            return "drop"
        if "startup" in lowered:
            return "rocket"
        if "disk" in lowered:
            return "chart"
        if "log" in lowered:
            return "list"
        return "shield"

    def _activity_accent(self, action: str) -> str:
        lowered = action.lower()
        if "startup" in lowered:
            return "purple"
        if "disk" in lowered:
            return "orange"
        if "log" in lowered:
            return "green"
        return "blue"

    def apply_language_selection(self) -> None:
        language = self.language_selector.currentData()
        if not language or language == self.language:
            return
        self.language = str(language)
        save_language(self.language)
        self.show_readable_message(
            self.t("language_saved"),
            self.t(
                "language_saved_detail",
                language_name=LANGUAGE_LABELS[self.language],
            ),
        )

    def set_busy(self, busy: bool) -> None:
        for button in self.action_buttons:
            button.setEnabled(not busy)

    def run_worker(
        self,
        task: Callable[[], object],
        callback: Callable[[object], None],
        busy_text: str,
    ) -> None:
        self.set_busy(True)
        self.log(self.t("started"), busy_text)
        self.worker = Worker(task)
        self.worker.finished_ok.connect(
            lambda result: self._worker_finished(result, callback)
        )
        self.worker.failed.connect(self._worker_failed)
        self.worker.start()

    def _worker_finished(
        self, result: object, callback: Callable[[object], None]
    ) -> None:
        self.set_busy(False)
        callback(result)
        self.worker = None

    def _worker_failed(self, message: str) -> None:
        self.set_busy(False)
        self.log("Error", message)
        self.show_readable_message("CleanStart", message)
        self.worker = None

    def show_readable_message(self, title: str, message: str) -> None:
        box = QMessageBox(self)
        box.setWindowTitle(title)
        box.setText(message)
        box.setStandardButtons(QMessageBox.StandardButton.Ok)
        box.setStyleSheet(
            """
            QMessageBox {
                background: #ffffff;
                color: #172033;
            }
            QLabel {
                color: #172033;
                font-family: "Segoe UI";
                font-size: 13px;
                min-width: 320px;
            }
            QPushButton {
                background: #1f6feb;
                color: #ffffff;
                border: 1px solid #1f6feb;
                border-radius: 7px;
                padding: 8px 14px;
                font-weight: 700;
                min-width: 90px;
            }
            """
        )
        box.exec()

    def preview_temp(self) -> None:
        self.tabs.setCurrentWidget(self.temp_table.parentWidget())
        self.temp_summary.setText(self.t("scanning_temp"))
        self.run_worker(scan_temp_items, self.show_temp_result, self.t("scanning_temp"))

    def show_temp_result(self, result: object) -> None:
        scan = result if isinstance(result, TempScanResult) else TempScanResult()
        self.temp_result = scan
        self.temp_items_by_path = {str(item.path): item for item in scan.items}
        self._reset_table(self.temp_table)

        if not scan.items:
            self._show_empty_table(
                self.temp_table,
                self.t("temp_no_items"),
            )
        else:
            for item in scan.items:
                row = self.temp_table.rowCount()
                self.temp_table.insertRow(row)
                values = [
                    (
                        self.t("path_type_folder")
                        if item.item_type == "Folder"
                        else self.t("path_type_file")
                    ),
                    format_size(item.size),
                    truncate_middle(item.source, 52),
                    str(item.path),
                ]
                for column, value in enumerate(values):
                    table_item = self._table_item(value)
                    table_item.setData(Qt.ItemDataRole.UserRole, str(item.path))
                    self.temp_table.setItem(row, column, table_item)
                self.temp_table.setRowHeight(row, 36)

        now = datetime.now().strftime("%H:%M:%S")
        self.temp_items_stat.setText(str(scan.total_count))
        self.temp_size_stat.setText(format_size(scan.total_size))
        self.temp_time_stat.setText(now)

        if scan.items:
            summary = self.t(
                "temp_scan_summary",
                count=scan.total_count,
                size=format_size(scan.total_size),
            )
        else:
            summary = self.t("temp_no_items")
        if scan.errors:
            summary += self.t("permission_warning_suffix", count=len(scan.errors))
            self.log(
                self.t("temp_preview"),
                f"{len(scan.errors)} access or read errors were skipped.",
            )
        self.temp_summary.setText(summary)
        self.last_temp_status = (
            f"{scan.total_count} item(s), {format_size(scan.total_size)}"
        )
        self.log(self.t("temp_preview"), self.last_temp_status)
        self.refresh_dashboard()

    def selected_temp_paths(self) -> list[Path]:
        rows = sorted({index.row() for index in self.temp_table.selectedIndexes()})
        paths: list[Path] = []
        for row in rows:
            item = self.temp_table.item(row, 3)
            if item:
                path_value = item.data(Qt.ItemDataRole.UserRole) or item.text()
                if path_value and str(path_value) in self.temp_items_by_path:
                    paths.append(Path(str(path_value)))
        return paths

    def dry_run_temp(self) -> None:
        paths = self.selected_temp_paths()
        if not paths:
            self.show_readable_message("CleanStart", self.t("select_items_first"))
            return
        result = cleanup_temp_items(
            paths, dry_run=True, use_recycle_bin=self.recycle_check.isChecked()
        )
        self._show_cleanup_result(result)

    def clean_temp(self) -> None:
        paths = self.selected_temp_paths()
        if not paths:
            self.show_readable_message("CleanStart", self.t("select_items_first"))
            return
        dry_run = cleanup_temp_items(
            paths, dry_run=True, use_recycle_bin=self.recycle_check.isChecked()
        )
        dialog = CleanupConfirmDialog(
            self.language,
            dry_run.total_count,
            format_size(dry_run.total_size),
            self,
        )
        if dialog.exec() != QDialog.DialogCode.Accepted or not dialog.confirmed:
            self.log(self.t("cleanup_cancelled"), self.t("cleanup_cancelled_detail"))
            return
        self.run_worker(
            lambda: cleanup_temp_items(
                paths, dry_run=False, use_recycle_bin=self.recycle_check.isChecked()
            ),
            self._show_cleanup_result,
            self.t("clean_selected"),
        )

    def _show_cleanup_result(self, result: object) -> None:
        try:
            cleanup = result if isinstance(result, CleanupResult) else CleanupResult()
            prefix = self.t("dry_run") if cleanup.dry_run else self.t("clean_selected")
            removed_count = cleanup.total_count
            failed_count = len(cleanup.errors)
            detail = (
                f"{self.t('removed_count')}: {removed_count}, "
                f"{self.t('failed_count')}: {failed_count}, "
                f"{self.t('total_size')}: {format_size(cleanup.total_size)}"
            )
            self.log(prefix, detail)
            if cleanup.errors:
                for error in cleanup.errors:
                    self.log(self.t("cleanup_failed"), f"{error.path}: {error.message}")
            if not cleanup.dry_run:
                self.apply_cleanup_result_to_table(cleanup)
            self.show_readable_message(
                self.t("cleanup_result_title"), f"{prefix}: {detail}"
            )
        except Exception as exc:  # pragma: no cover - UI safety net
            log_exception("Cleanup result UI update failed", exc)
            self.log(self.t("cleanup_failed"), str(exc))
            self.show_readable_message(self.t("cleanup_failed"), str(exc))

    def apply_cleanup_result_to_table(self, cleanup: CleanupResult) -> None:
        removed_paths = {str(item.path) for item in cleanup.removed_items}
        failed_paths = {str(error.path) for error in cleanup.errors}

        for row in range(self.temp_table.rowCount() - 1, -1, -1):
            item = self.temp_table.item(row, 3)
            if not item:
                continue
            path_value = item.data(Qt.ItemDataRole.UserRole) or item.text()
            if str(path_value) in removed_paths:
                self.temp_table.removeRow(row)

        if self.temp_result:
            remaining_items = [
                item
                for item in self.temp_result.items
                if str(item.path) not in removed_paths
            ]
            self.temp_result = TempScanResult(
                items=remaining_items,
                errors=self.temp_result.errors + cleanup.errors,
            )
            self.temp_items_by_path = {str(item.path): item for item in remaining_items}
            remaining_count = self.temp_result.total_count
            remaining_size = self.temp_result.total_size
        else:
            remaining_count = max(self.temp_table.rowCount(), 0)
            remaining_size = 0

        if self.temp_table.rowCount() == 0:
            self._show_empty_table(self.temp_table, self.t("temp_no_items"))

        self.temp_items_stat.setText(str(remaining_count))
        self.temp_size_stat.setText(format_size(remaining_size))
        self.temp_time_stat.setText(datetime.now().strftime("%H:%M:%S"))

        summary = self.t(
            "temp_scan_summary",
            count=remaining_count,
            size=format_size(remaining_size),
        )
        if failed_paths:
            summary += f" {self.t('failed_count')}: {len(failed_paths)}."
        self.temp_summary.setText(summary)
        self.last_temp_status = (
            f"{remaining_count} item(s), {format_size(remaining_size)}"
        )
        self.refresh_dashboard()

    def analyze_startup(self) -> None:
        self.tabs.setCurrentWidget(self.startup_table.parentWidget())
        self.startup_summary.setText(self.t("analyze_startup"))
        self.run_worker(
            analyze_startup_entries,
            self.show_startup_result,
            self.t("analyze_startup"),
        )

    def show_startup_result(self, result: object) -> None:
        entries = result if isinstance(result, list) else []
        self._reset_table(self.startup_table)

        valid_entries = [entry for entry in entries if isinstance(entry, StartupEntry)]
        if not valid_entries:
            self._show_empty_table(self.startup_table, self.t("startup_empty"))
        else:
            for entry in valid_entries:
                row = self.startup_table.rowCount()
                self.startup_table.insertRow(row)
                values = [
                    entry.label,
                    entry.name,
                    entry.status,
                    entry.source,
                    entry.path,
                    entry.note,
                ]
                for column, value in enumerate(values):
                    self.startup_table.setItem(row, column, self._table_item(value))
                self.startup_table.setRowHeight(row, 36)

        count = len(valid_entries)
        self.last_startup_count = count
        self.startup_entries_stat.value_label.setText(str(count))  # type: ignore[attr-defined]
        self.startup_change_stat.value_label.setText(self.t("status_changes_zero"))  # type: ignore[attr-defined]
        self.startup_summary.setText(self.t("startup_no_changes", count=count))
        self.last_startup_status = f"{count} entry(s), no changes made"
        self.log(self.t("startup_analyzer"), self.last_startup_status)
        self.refresh_dashboard()

    def scan_profile_disk(self) -> None:
        self.tabs.setCurrentWidget(self.disk_table.parentWidget())
        self.disk_summary.setText(self.t("disk_scanning_profile"))
        self.run_worker(
            scan_profile_summary, self.show_disk_result, self.t("disk_scanning_profile")
        )

    def choose_disk_folder(self) -> None:
        folder = QFileDialog.getExistingDirectory(
            self, "Choose a folder to analyze", str(Path.home())
        )
        if not folder:
            return
        selected = Path(folder)
        if selected.anchor and selected == Path(selected.anchor):
            self.show_readable_message(
                "CleanStart", "Choose a normal folder, not an entire drive root."
            )
            return
        self.tabs.setCurrentWidget(self.disk_table.parentWidget())
        self.disk_summary.setText(self.t("disk_scanning_folder", folder=selected))
        self.run_worker(
            lambda: scan_largest_items(selected),
            self.show_disk_result,
            self.t("disk_scanning_folder", folder=selected),
        )

    def show_disk_result(self, result: object) -> None:
        scan = (
            result
            if isinstance(result, DiskScanResult)
            else DiskScanResult([], [], Path.home(), 0, False)
        )
        self._reset_table(self.disk_table)

        if not scan.items:
            self._show_empty_table(self.disk_table, self.t("disk_no_large_items"))
        else:
            for item in scan.items:
                row = self.disk_table.rowCount()
                self.disk_table.insertRow(row)
                values = [
                    (
                        self.t("path_type_folder")
                        if item.item_type == "Folder"
                        else self.t("path_type_file")
                    ),
                    format_size(item.size),
                    str(item.path),
                ]
                for column, value in enumerate(values):
                    self.disk_table.setItem(row, column, self._table_item(value))
                self.disk_table.setRowHeight(row, 36)

        root_text = str(scan.scanned_root)
        self.disk_folder_stat.setText(truncate_middle(root_text, 42))
        self.disk_reviewed_stat.setText(str(scan.scanned_items))
        self.disk_shown_stat.setText(str(len(scan.items)))
        self.last_disk_count = len(scan.items)
        self.last_disk_root = root_text

        summary = self.t(
            "disk_scan_complete",
            root=root_text,
            reviewed=scan.scanned_items,
            shown=len(scan.items),
        )
        if scan.stopped_early:
            summary += self.t("disk_safety_limit")
        if scan.errors:
            summary += self.t("permission_warning_suffix", count=len(scan.errors))
            self.log(
                self.t("disk_scan_warnings"),
                f"{len(scan.errors)} access or read errors were skipped.",
            )
        self.disk_summary.setText(summary)
        self.last_disk_status = (
            f"{len(scan.items)} item(s) shown from {truncate_middle(root_text, 34)}"
        )
        self.log(self.t("disk_analyzer"), self.last_disk_status)
        self.refresh_dashboard()

    def copy_log(self) -> None:
        QApplication.clipboard().setText(self.log_view.toPlainText())
        self.log(self.t("log_copied"), self.t("log_copied_detail"))

    def clear_visible_log(self) -> None:
        self.log_view.clear()
        entry = self.activity.add(
            self.t("visible_log_cleared"),
            self.t("visible_log_cleared_detail"),
        )
        self.log_view.append(entry.render())
        self.last_log_status = self.t("visible_log_cleared")
        self.refresh_dashboard()


def main() -> None:
    app = QApplication(sys.argv)
    app.setApplicationName("CleanStart")
    window = CleanStartWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
