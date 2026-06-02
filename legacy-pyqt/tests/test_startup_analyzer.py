from core.startup_analyzer import _extract_path


def test_extract_path_handles_quoted_commands() -> None:
    assert (
        _extract_path(r'"C:\Program Files\App\app.exe" --start')
        == r"C:\Program Files\App\app.exe"
    )


def test_extract_path_handles_plain_commands() -> None:
    assert _extract_path(r"C:\Tools\app.exe --start") == r"C:\Tools\app.exe"


def test_extract_path_handles_unquoted_paths_with_spaces() -> None:
    assert (
        _extract_path(r"C:\Program Files\App Folder\app.exe --start")
        == r"C:\Program Files\App Folder\app.exe"
    )
