from __future__ import annotations

from pathlib import Path
from typing import Callable

from PyQt6.QtCore import QPointF, QRectF, QSize, Qt
from PyQt6.QtGui import QColor, QIcon, QPainter, QPainterPath, QPen, QPixmap, QPolygonF
from PyQt6.QtWidgets import (
    QCheckBox,
    QFrame,
    QGraphicsDropShadowEffect,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)


NAV_ITEMS: tuple[tuple[str, str], ...] = (
    ("home", "Dashboard"),
    ("drop", "Temp Cleaner"),
    ("rocket", "Startup Analyzer"),
    ("chart", "Disk Analyzer"),
    ("list", "Activity Log"),
    ("gear", "Settings"),
)

ACCENTS: dict[str, tuple[str, str, str]] = {
    "blue": ("#0f6bff", "#eaf3ff", "#d8eaff"),
    "purple": ("#7a22e6", "#f1e8ff", "#e6d7ff"),
    "orange": ("#f97316", "#fff0e4", "#ffe1c4"),
    "green": ("#059669", "#e8f8ef", "#cdeedd"),
    "soft": ("#1f6feb", "#eaf3ff", "#d8eaff"),
}


def add_shadow(
    widget: QWidget, blur: int = 30, alpha: int = 18, offset: int = 10
) -> None:
    shadow = QGraphicsDropShadowEffect(widget)
    shadow.setBlurRadius(blur)
    shadow.setOffset(0, offset)
    shadow.setColor(QColor(31, 93, 166, alpha))
    widget.setGraphicsEffect(shadow)


def _line_pen(color: str, width: int = 3) -> QPen:
    pen = QPen(QColor(color), width)
    pen.setCapStyle(Qt.PenCapStyle.RoundCap)
    pen.setJoinStyle(Qt.PenJoinStyle.RoundJoin)
    return pen


def draw_line_icon(painter: QPainter, icon: str, rect: QRectF, color: str) -> None:
    painter.save()
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    painter.setPen(_line_pen(color, max(2, int(rect.width() / 11))))
    painter.setBrush(Qt.BrushStyle.NoBrush)
    x, y, w, h = rect.x(), rect.y(), rect.width(), rect.height()

    if icon == "home":
        roof = QPolygonF(
            [
                QPointF(x + w * 0.16, y + h * 0.48),
                QPointF(x + w * 0.50, y + h * 0.18),
                QPointF(x + w * 0.84, y + h * 0.48),
            ]
        )
        painter.drawPolyline(roof)
        painter.drawRoundedRect(
            QRectF(x + w * 0.28, y + h * 0.45, w * 0.44, h * 0.40), 3, 3
        )
    elif icon == "drop":
        path = QPainterPath(QPointF(x + w * 0.50, y + h * 0.12))
        path.cubicTo(
            x + w * 0.22,
            y + h * 0.45,
            x + w * 0.20,
            y + h * 0.66,
            x + w * 0.50,
            y + h * 0.88,
        )
        path.cubicTo(
            x + w * 0.80,
            y + h * 0.66,
            x + w * 0.78,
            y + h * 0.45,
            x + w * 0.50,
            y + h * 0.12,
        )
        painter.drawPath(path)
    elif icon == "rocket":
        path = QPainterPath(QPointF(x + w * 0.34, y + h * 0.72))
        path.cubicTo(
            x + w * 0.38,
            y + h * 0.30,
            x + w * 0.62,
            y + h * 0.14,
            x + w * 0.82,
            y + h * 0.16,
        )
        path.cubicTo(
            x + w * 0.86,
            y + h * 0.38,
            x + w * 0.70,
            y + h * 0.62,
            x + w * 0.28,
            y + h * 0.66,
        )
        path.closeSubpath()
        painter.drawPath(path)
        painter.drawEllipse(QRectF(x + w * 0.56, y + h * 0.30, w * 0.13, h * 0.13))
        painter.drawLine(
            QPointF(x + w * 0.30, y + h * 0.68), QPointF(x + w * 0.18, y + h * 0.84)
        )
        painter.drawLine(
            QPointF(x + w * 0.38, y + h * 0.76), QPointF(x + w * 0.30, y + h * 0.90)
        )
    elif icon == "chart":
        painter.drawEllipse(QRectF(x + w * 0.18, y + h * 0.20, w * 0.62, h * 0.62))
        painter.drawLine(
            QPointF(x + w * 0.49, y + h * 0.51), QPointF(x + w * 0.49, y + h * 0.18)
        )
        painter.drawLine(
            QPointF(x + w * 0.49, y + h * 0.51), QPointF(x + w * 0.84, y + h * 0.51)
        )
    elif icon == "list":
        for row in (0.28, 0.50, 0.72):
            painter.drawLine(
                QPointF(x + w * 0.34, y + h * row), QPointF(x + w * 0.80, y + h * row)
            )
            painter.drawEllipse(
                QRectF(x + w * 0.18, y + h * row - h * 0.035, w * 0.07, h * 0.07)
            )
    elif icon == "gear":
        painter.drawEllipse(QRectF(x + w * 0.32, y + h * 0.32, w * 0.36, h * 0.36))
        painter.drawEllipse(QRectF(x + w * 0.43, y + h * 0.43, w * 0.14, h * 0.14))
        center = QPointF(x + w * 0.50, y + h * 0.50)
        for dx, dy in (
            (0, -0.34),
            (0.24, -0.24),
            (0.34, 0),
            (0.24, 0.24),
            (0, 0.34),
            (-0.24, 0.24),
            (-0.34, 0),
            (-0.24, -0.24),
        ):
            painter.drawLine(center, QPointF(x + w * (0.50 + dx), y + h * (0.50 + dy)))
    elif icon == "shield":
        path = QPainterPath(QPointF(x + w * 0.50, y + h * 0.12))
        path.lineTo(x + w * 0.78, y + h * 0.24)
        path.lineTo(x + w * 0.72, y + h * 0.62)
        path.cubicTo(
            x + w * 0.68,
            y + h * 0.76,
            x + w * 0.58,
            y + h * 0.86,
            x + w * 0.50,
            y + h * 0.90,
        )
        path.cubicTo(
            x + w * 0.42,
            y + h * 0.86,
            x + w * 0.32,
            y + h * 0.76,
            x + w * 0.28,
            y + h * 0.62,
        )
        path.lineTo(x + w * 0.22, y + h * 0.24)
        path.closeSubpath()
        painter.drawPath(path)
        painter.drawLine(
            QPointF(x + w * 0.36, y + h * 0.52), QPointF(x + w * 0.47, y + h * 0.64)
        )
        painter.drawLine(
            QPointF(x + w * 0.47, y + h * 0.64), QPointF(x + w * 0.67, y + h * 0.40)
        )
    elif icon == "flash":
        painter.drawPolyline(
            QPolygonF(
                [
                    QPointF(x + w * 0.56, y + h * 0.12),
                    QPointF(x + w * 0.28, y + h * 0.56),
                    QPointF(x + w * 0.50, y + h * 0.56),
                    QPointF(x + w * 0.40, y + h * 0.88),
                    QPointF(x + w * 0.72, y + h * 0.44),
                    QPointF(x + w * 0.50, y + h * 0.44),
                ]
            )
        )
    elif icon == "activity":
        painter.drawPolyline(
            QPolygonF(
                [
                    QPointF(x + w * 0.12, y + h * 0.58),
                    QPointF(x + w * 0.34, y + h * 0.58),
                    QPointF(x + w * 0.44, y + h * 0.30),
                    QPointF(x + w * 0.58, y + h * 0.76),
                    QPointF(x + w * 0.68, y + h * 0.46),
                    QPointF(x + w * 0.88, y + h * 0.46),
                ]
            )
        )
    elif icon == "folder":
        painter.drawRoundedRect(
            QRectF(x + w * 0.14, y + h * 0.34, w * 0.72, h * 0.50), 5, 5
        )
        painter.drawLine(
            QPointF(x + w * 0.18, y + h * 0.36), QPointF(x + w * 0.35, y + h * 0.24)
        )
        painter.drawLine(
            QPointF(x + w * 0.35, y + h * 0.24), QPointF(x + w * 0.52, y + h * 0.34)
        )
    elif icon == "document":
        painter.drawRoundedRect(
            QRectF(x + w * 0.22, y + h * 0.14, w * 0.42, h * 0.60), 4, 4
        )
        painter.drawLine(
            QPointF(x + w * 0.31, y + h * 0.34), QPointF(x + w * 0.52, y + h * 0.34)
        )
        painter.drawLine(
            QPointF(x + w * 0.31, y + h * 0.50), QPointF(x + w * 0.48, y + h * 0.50)
        )
        painter.drawEllipse(QRectF(x + w * 0.54, y + h * 0.56, w * 0.23, h * 0.23))
        painter.drawLine(
            QPointF(x + w * 0.72, y + h * 0.74), QPointF(x + w * 0.86, y + h * 0.88)
        )
    elif icon == "app":
        painter.setBrush(QColor(255, 255, 255, 210))
        painter.drawEllipse(QRectF(x + w * 0.32, y + h * 0.32, w * 0.36, h * 0.36))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawEllipse(QRectF(x + w * 0.68, y + h * 0.14, w * 0.11, h * 0.11))
        painter.drawEllipse(QRectF(x + w * 0.20, y + h * 0.72, w * 0.11, h * 0.11))
    else:
        painter.drawEllipse(rect.adjusted(w * 0.22, h * 0.22, -w * 0.22, -h * 0.22))
    painter.restore()


def icon_pixmap(icon: str, color: str, size: int = 24) -> QPixmap:
    pixmap = QPixmap(size, size)
    pixmap.fill(Qt.GlobalColor.transparent)
    painter = QPainter(pixmap)
    draw_line_icon(painter, icon, QRectF(2, 2, size - 4, size - 4), color)
    painter.end()
    return pixmap


class IconBadge(QWidget):
    def __init__(self, icon: str, accent: str = "blue", size: int = 54) -> None:
        super().__init__()
        self.icon = icon
        self.accent = accent
        self.setFixedSize(size, size)

    def paintEvent(self, event) -> None:  # type: ignore[override]
        color, background, border = ACCENTS.get(self.accent, ACCENTS["blue"])
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        rect = QRectF(1, 1, self.width() - 2, self.height() - 2)
        painter.setPen(QPen(QColor(border), 1))
        painter.setBrush(QColor(background))
        painter.drawRoundedRect(rect, self.width() * 0.28, self.height() * 0.28)
        icon_rect = rect.adjusted(
            self.width() * 0.23,
            self.height() * 0.23,
            -self.width() * 0.23,
            -self.height() * 0.23,
        )
        draw_line_icon(painter, self.icon, icon_rect, color)


class AppShell(QWidget):
    def __init__(self, background_path: Path | None = None) -> None:
        super().__init__()
        self.background = (
            QPixmap(str(background_path)) if background_path else QPixmap()
        )
        self.setObjectName("AppShell")
        self.setAutoFillBackground(False)
        self.setStyleSheet("QWidget#AppShell { background: #f3f8ff; }")

    def paintEvent(self, event) -> None:  # type: ignore[override]
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
        if not self.background.isNull():
            scaled = self.background.scaled(
                self.size(),
                Qt.AspectRatioMode.KeepAspectRatioByExpanding,
                Qt.TransformationMode.SmoothTransformation,
            )
            x = (self.width() - scaled.width()) // 2
            y = (self.height() - scaled.height()) // 2
            painter.drawPixmap(x, y, scaled)
        else:
            painter.fillRect(self.rect(), QColor("#f4f9ff"))
        painter.fillRect(self.rect(), QColor(255, 255, 255, 88))
        super().paintEvent(event)


class GlassCard(QFrame):
    def __init__(self, radius: int = 26) -> None:
        super().__init__()
        self.setObjectName("GlassCard")
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Preferred)
        self.setStyleSheet(
            f"""
            QFrame#GlassCard {{
                background: rgba(255, 255, 255, 198);
                border: 1px solid rgba(205, 225, 247, 165);
                border-radius: {radius}px;
            }}
            """
        )
        add_shadow(self, blur=28, alpha=16, offset=8)


class GradientButton(QPushButton):
    def __init__(
        self,
        text: str,
        accent: str = "blue",
        callback: Callable[[], None] | None = None,
    ) -> None:
        super().__init__(text)
        if callback:
            self.clicked.connect(callback)
        gradients = {
            "blue": ("#41a8ff", "#0f6bff"),
            "purple": ("#b168ff", "#822ee8"),
            "orange": ("#ff9d4d", "#ff6a1a"),
            "green": ("#43d6a0", "#0aa978"),
            "soft": ("#cfe5ff", "#a9ccfa"),
        }
        start, end = gradients.get(accent, gradients["blue"])
        text_color = "#ffffff" if accent != "soft" else "#0b62d4"
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setMinimumHeight(34)
        self.setStyleSheet(
            f"""
            QPushButton {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 {start}, stop:1 {end});
                color: {text_color};
                border: 1px solid {end};
                border-radius: 11px;
                font-size: 12px;
                font-weight: 800;
                padding: 7px 14px;
            }}
            QPushButton:hover {{
                border-color: #0757ce;
            }}
            QPushButton:pressed {{
                background: {end};
            }}
            QPushButton:disabled {{
                background: #b9c7d8;
                border-color: #b9c7d8;
                color: #eff6ff;
            }}
            """
        )


class ToggleSwitch(QCheckBox):
    def __init__(self, checked: bool = True) -> None:
        super().__init__()
        self.setChecked(checked)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setFixedSize(58, 34)

    def sizeHint(self) -> QSize:  # type: ignore[override]
        return QSize(58, 34)

    def mousePressEvent(self, event) -> None:  # type: ignore[override]
        if event.button() == Qt.MouseButton.LeftButton:
            self.setChecked(not self.isChecked())
            event.accept()
            return
        super().mousePressEvent(event)

    def paintEvent(self, event) -> None:  # type: ignore[override]
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        track = QRectF(1, 3, 56, 28)
        track_color = QColor("#0f6bff" if self.isChecked() else "#cbd5e1")
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(track_color)
        painter.drawRoundedRect(track, 14, 14)
        knob_x = 30 if self.isChecked() else 4
        painter.setBrush(QColor("#ffffff"))
        painter.drawEllipse(QRectF(knob_x, 6, 22, 22))


class TopNavBar(QWidget):
    def __init__(self, on_change: Callable[[int], None]) -> None:
        super().__init__()
        self.on_change = on_change
        self.buttons: list[QPushButton] = []
        root = QHBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(22)

        brand = QHBoxLayout()
        brand.setSpacing(10)
        logo = IconBadge("app", "blue", 48)
        title_group = QVBoxLayout()
        title_group.setSpacing(1)
        name = QLabel("CleanStart")
        name.setStyleSheet("font-size: 21px; font-weight: 900; color: #07143d;")
        version = QLabel("v0.1.0")
        version.setStyleSheet("font-size: 12px; font-weight: 700; color: #4e6384;")
        title_group.addWidget(name)
        title_group.addWidget(version)
        brand.addWidget(logo)
        brand.addLayout(title_group)
        root.addLayout(brand)

        nav_shell = QFrame()
        nav_shell.setObjectName("NavShell")
        nav_shell.setStyleSheet(
            """
            QFrame#NavShell {
                background: rgba(255, 255, 255, 205);
                border: 1px solid rgba(211, 225, 242, 190);
                border-radius: 27px;
            }
            """
        )
        add_shadow(nav_shell, blur=24, alpha=18, offset=8)
        nav = QHBoxLayout(nav_shell)
        nav.setContentsMargins(8, 7, 8, 7)
        nav.setSpacing(7)
        for index, (icon, label) in enumerate(NAV_ITEMS):
            button = QPushButton(label)
            button.icon_name = icon  # type: ignore[attr-defined]
            button.setCheckable(True)
            button.setCursor(Qt.CursorShape.PointingHandCursor)
            button.setIcon(QIcon(icon_pixmap(icon, "#526684", 22)))
            button.setIconSize(QSize(20, 20))
            button.clicked.connect(lambda checked=False, i=index: self.handle_click(i))
            self.buttons.append(button)
            nav.addWidget(button)
        root.addWidget(nav_shell, 1, Qt.AlignmentFlag.AlignHCenter)
        root.addStretch()
        self.set_active(0)

    def handle_click(self, index: int) -> None:
        self.on_change(index)
        self.set_active(index)

    def set_active(self, index: int) -> None:
        for button_index, button in enumerate(self.buttons):
            active = button_index == index
            button.setChecked(active)
            icon_name = getattr(button, "icon_name", "home")
            button.setIcon(
                QIcon(icon_pixmap(icon_name, "#0f6bff" if active else "#526684", 22))
            )
            button.setStyleSheet(
                """
                QPushButton {
                    background: transparent;
                    color: #485a78;
                    border: 1px solid transparent;
                    border-radius: 22px;
                    padding: 10px 16px;
                    font-size: 13px;
                    font-weight: 750;
                }
                QPushButton:hover {
                    background: rgba(255, 255, 255, 150);
                    color: #0b1b43;
                }
                QPushButton:checked {
                    background: #ffffff;
                    color: #0f6bff;
                    border: 1px solid #d8e9ff;
                }
                """
            )


class SafetyBanner(GlassCard):
    def __init__(self, title: str, detail: str) -> None:
        super().__init__(radius=17)
        self.setFixedHeight(50)
        self.setStyleSheet(
            """
            QFrame#GlassCard {
                background: rgba(232, 248, 239, 192);
                border: 1px solid rgba(184, 232, 207, 150);
                border-radius: 17px;
            }
            """
        )
        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 7, 13, 7)
        layout.setSpacing(10)
        layout.addWidget(IconBadge("shield", "green", 34))
        text = QVBoxLayout()
        heading = QLabel(title)
        heading.setStyleSheet("color: #08723f; font-size: 11px; font-weight: 900;")
        body = QLabel(detail)
        body.setStyleSheet("color: #1f6f4b; font-size: 10px;")
        body.setWordWrap(True)
        text.addWidget(heading)
        text.addWidget(body)
        layout.addLayout(text, 1)


class SummaryCard(GlassCard):
    def __init__(
        self,
        title: str,
        description: str,
        icon: str,
        accent: str,
        primary_label: str,
        secondary_label: str,
        button_text: str,
        callback: Callable[[], None],
    ) -> None:
        super().__init__(radius=24)
        self.setFixedHeight(162)
        self.status_value = QLabel("Not scanned yet")
        self.primary_value = QLabel("0")
        self.secondary_value = QLabel("Not scanned")

        root = QVBoxLayout(self)
        root.setContentsMargins(16, 13, 16, 13)
        root.setSpacing(7)
        header = QHBoxLayout()
        header.setSpacing(10)
        header.addWidget(IconBadge(icon, accent, 42))
        copy = QVBoxLayout()
        copy.setSpacing(3)
        title_label = QLabel(title)
        title_label.setStyleSheet("color: #07143d; font-size: 13px; font-weight: 900;")
        description_label = QLabel(description)
        description_label.setWordWrap(True)
        description_label.setStyleSheet(
            "color: #4b5f80; font-size: 10px; line-height: 1.20;"
        )
        copy.addWidget(title_label)
        copy.addWidget(description_label)
        header.addLayout(copy, 1)
        dot = QLabel()
        dot.setFixedSize(10, 10)
        dot.setStyleSheet("background: #10b981; border-radius: 5px;")
        header.addWidget(dot, 0, Qt.AlignmentFlag.AlignTop)
        root.addLayout(header)

        stats = QHBoxLayout()
        stats.setSpacing(10)
        stats.addLayout(self._stat_block(self.primary_value, primary_label))
        divider = QFrame()
        divider.setFixedWidth(1)
        divider.setStyleSheet("background: #dbe5f2;")
        stats.addWidget(divider)
        stats.addLayout(self._stat_block(self.secondary_value, secondary_label))
        root.addLayout(stats)
        actions = QHBoxLayout()
        actions.setSpacing(8)
        actions.addWidget(GradientButton(button_text, accent, callback), 1)
        arrow = QPushButton(">")
        arrow.setFixedSize(34, 34)
        arrow.setCursor(Qt.CursorShape.PointingHandCursor)
        arrow.clicked.connect(callback)
        arrow.setStyleSheet(
            """
            QPushButton {
                background: rgba(255, 255, 255, 180);
                border: 1px solid #d7e2ef;
                border-radius: 12px;
                color: #07143d;
                font-size: 18px;
                font-weight: 900;
            }
            QPushButton:hover { background: #ffffff; border-color: #b7cee8; }
            """
        )
        actions.addWidget(arrow)
        root.addLayout(actions)

    def _stat_block(self, value: QLabel, label: str) -> QVBoxLayout:
        block = QVBoxLayout()
        block.setSpacing(2)
        value.setWordWrap(False)
        value.setStyleSheet("color: #07143d; font-size: 17px; font-weight: 900;")
        label_widget = QLabel(label)
        label_widget.setStyleSheet("color: #526684; font-size: 10px;")
        block.addWidget(value)
        block.addWidget(label_widget)
        return block


class QuickActionTile(QPushButton):
    def __init__(
        self, title: str, icon: str, accent: str, callback: Callable[[], None]
    ) -> None:
        super().__init__()
        self.setFixedHeight(82)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.clicked.connect(callback)
        self.setStyleSheet(
            """
            QPushButton {
                background: rgba(255, 255, 255, 174);
                border: 1px solid rgba(205, 225, 247, 170);
                border-radius: 20px;
            }
            QPushButton:hover {
                background: rgba(255, 255, 255, 215);
                border-color: #b8d3f0;
            }
            QPushButton:pressed {
                background: rgba(235, 245, 255, 225);
            }
            """
        )
        add_shadow(self, blur=18, alpha=10, offset=5)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(10, 8, 10, 8)
        layout.setSpacing(6)
        badge = IconBadge(icon, accent, 34)
        badge.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        layout.addWidget(badge, 0, Qt.AlignmentFlag.AlignHCenter)
        label = QLabel(title)
        label.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        label.setWordWrap(True)
        label.setStyleSheet(
            f"color: {ACCENTS.get(accent, ACCENTS['blue'])[0]}; font-size: 11px; font-weight: 900;"
        )
        layout.addWidget(label)


class RecentActivityRow(QFrame):
    def __init__(
        self, title: str, detail: str, time_text: str, icon: str, accent: str
    ) -> None:
        super().__init__()
        self.setObjectName("ActivityRow")
        self.setFixedHeight(36)
        self.setStyleSheet(
            """
            QFrame#ActivityRow {
                background: rgba(255, 255, 255, 82);
                border-bottom: 1px solid #dce6f2;
            }
            """
        )
        layout = QHBoxLayout(self)
        layout.setContentsMargins(9, 3, 9, 3)
        layout.setSpacing(8)
        layout.addWidget(IconBadge(icon, accent, 28))
        copy = QVBoxLayout()
        copy.setSpacing(2)
        title_label = QLabel(title)
        title_label.setStyleSheet("color: #07143d; font-size: 10px; font-weight: 900;")
        detail_label = QLabel(detail)
        detail_label.setStyleSheet("color: #526684; font-size: 9px;")
        detail_label.setWordWrap(True)
        copy.addWidget(title_label)
        copy.addWidget(detail_label)
        layout.addLayout(copy, 1)
        time_label = QLabel(time_text)
        time_label.setStyleSheet("color: #526684; font-size: 9px;")
        layout.addWidget(time_label)
        dot = QLabel()
        dot.setFixedSize(8, 8)
        dot.setStyleSheet("background: #10b981; border-radius: 4px;")
        layout.addWidget(dot)


class BottomStatusBar(GlassCard):
    def __init__(self, toggle: ToggleSwitch) -> None:
        super().__init__(radius=23)
        self.last_scan = QLabel("Last scan: Not scanned yet")
        self.setFixedHeight(58)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 8, 16, 8)
        layout.setSpacing(18)
        layout.addWidget(IconBadge("shield", "green", 38))
        health = QVBoxLayout()
        healthy = QLabel("System is healthy")
        healthy.setStyleSheet("color: #08723f; font-size: 12px; font-weight: 900;")
        detail = QLabel("No issues detected")
        detail.setStyleSheet("color: #526684; font-size: 11px;")
        health.addWidget(healthy)
        health.addWidget(detail)
        layout.addLayout(health, 1)
        layout.addWidget(IconBadge("activity", "green", 30))
        self.last_scan.setStyleSheet(
            "color: #526684; font-size: 12px; font-weight: 700;"
        )
        layout.addWidget(self.last_scan, 1)
        recycle = QLabel("Move to Recycle Bin when supported")
        recycle.setStyleSheet("color: #526684; font-size: 12px;")
        layout.addWidget(recycle)
        layout.addWidget(toggle)


class HeroIllustration(QWidget):
    def __init__(self, image_path: Path) -> None:
        super().__init__()
        self.image = QPixmap(str(image_path))
        self.setFixedSize(360, 150)

    def paintEvent(self, event) -> None:  # type: ignore[override]
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
        if not self.image.isNull():
            target = QRectF(4, -4, self.width() - 8, self.height() + 8)
            shadow = QPainterPath()
            shadow.addRoundedRect(target.adjusted(18, 24, -28, -14), 42, 42)
            painter.setPen(Qt.PenStyle.NoPen)
            painter.setBrush(QColor(64, 139, 255, 20))
            painter.drawPath(shadow)

            clip = QPainterPath()
            clip.addRoundedRect(target.adjusted(6, 0, -8, -4), 44, 44)
            painter.save()
            painter.setClipPath(clip)
            scaled = self.image.scaled(
                target.size().toSize(),
                Qt.AspectRatioMode.KeepAspectRatioByExpanding,
                Qt.TransformationMode.SmoothTransformation,
            )
            x = int(target.x() + (target.width() - scaled.width()) / 2)
            y = int(target.y() + (target.height() - scaled.height()) / 2)
            painter.setOpacity(0.70)
            painter.drawPixmap(x, y, scaled)
            painter.setOpacity(1.0)
            painter.fillRect(target, QColor(255, 255, 255, 32))
            painter.restore()

            painter.setPen(QPen(QColor(210, 229, 255, 88), 1))
            painter.setBrush(Qt.BrushStyle.NoBrush)
            painter.drawPath(clip)
            return
        path = QPainterPath()
        path.addRoundedRect(
            QRectF(35, 20, self.width() - 70, self.height() - 45), 32, 32
        )
        painter.setPen(QPen(QColor("#8fc2ff"), 2))
        painter.setBrush(QColor(224, 240, 255, 155))
        painter.drawPath(path)
        painter.setPen(QPen(QColor("#0f6bff"), 8, Qt.PenStyle.SolidLine))
        center = QPointF(self.width() * 0.55, self.height() * 0.52)
        painter.drawLine(
            QPointF(center.x() - 42, center.y()),
            QPointF(center.x() - 10, center.y() + 32),
        )
        painter.drawLine(
            QPointF(center.x() - 10, center.y() + 32),
            QPointF(center.x() + 58, center.y() - 52),
        )
