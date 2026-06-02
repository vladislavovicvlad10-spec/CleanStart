from utils.i18n import (
    DEFAULT_LANGUAGE,
    LANGUAGE_LABELS,
    SUPPORTED_LANGUAGES,
    missing_translation_keys,
    translate,
)


def test_supported_languages_have_labels() -> None:
    assert DEFAULT_LANGUAGE == "en"
    assert set(SUPPORTED_LANGUAGES) == {"en", "ru"}
    assert LANGUAGE_LABELS["en"] == "English"
    assert LANGUAGE_LABELS["ru"] == "Русский"


def test_languages_have_required_keys() -> None:
    assert missing_translation_keys() == {}


def test_translate_falls_back_to_english_for_unknown_language() -> None:
    assert translate("missing", "cancel") == "Cancel"
