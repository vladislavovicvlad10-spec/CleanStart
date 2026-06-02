from utils.formatting import format_size, truncate_middle


def test_format_size_uses_readable_units() -> None:
    assert format_size(0) == "0 B"
    assert format_size(1024) == "1.0 KB"
    assert format_size(5 * 1024 * 1024) == "5.0 MB"


def test_truncate_middle_keeps_short_values() -> None:
    assert truncate_middle("short", 10) == "short"
    assert truncate_middle("abcdefghijklmnopqrstuvwxyz", 12).startswith("abcd")
