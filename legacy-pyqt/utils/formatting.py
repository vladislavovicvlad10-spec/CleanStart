from __future__ import annotations


def format_size(size_bytes: int | float) -> str:
    """Return a readable file size without implying fake precision."""
    size = max(float(size_bytes), 0.0)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if size < 1024 or unit == "TB":
            if unit == "B":
                return f"{int(size)} {unit}"
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"


def truncate_middle(value: str, max_length: int = 96) -> str:
    if len(value) <= max_length:
        return value
    keep = max_length - 3
    left = keep // 2
    right = keep - left
    return f"{value[:left]}...{value[-right:]}"
