import pytest
from parsers import extract_text


def test_txt_basic():
    text = extract_text("doc.txt", b"Hello world. This is a test.")
    assert text == "Hello world. This is a test."


def test_txt_unicode():
    raw = "Café naïve résumé".encode("utf-8")
    text = extract_text("doc.txt", raw)
    assert "Café" in text


def test_txt_empty():
    text = extract_text("doc.txt", b"")
    assert text == ""


def test_unsupported_extension():
    with pytest.raises(ValueError, match="Unsupported"):
        extract_text("doc.xyz", b"content")


def test_unsupported_md():
    with pytest.raises(ValueError):
        extract_text("readme.md", b"# Heading")
