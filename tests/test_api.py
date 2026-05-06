import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_parse_txt_success():
    response = client.post(
        "/api/parse",
        files={"file": ("test.txt", b"Hello world. This is a test document.", "text/plain")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert data["word_count"] > 0
    assert data["filename"] == "test.txt"
    assert "Hello world" in data["text"]


def test_parse_txt_word_count():
    response = client.post(
        "/api/parse",
        files={"file": ("test.txt", b"one two three four five", "text/plain")},
    )
    assert response.status_code == 200
    assert response.json()["word_count"] == 5


def test_parse_unsupported_format():
    response = client.post(
        "/api/parse",
        files={"file": ("readme.md", b"# Heading", "text/markdown")},
    )
    assert response.status_code == 400
    assert "Unsupported" in response.json()["detail"]


def test_parse_empty_file():
    response = client.post(
        "/api/parse",
        files={"file": ("empty.txt", b"   \n\t  ", "text/plain")},
    )
    assert response.status_code == 422


def test_parse_no_file():
    response = client.post("/api/parse")
    assert response.status_code == 422


def test_parse_returns_char_count():
    content = b"Hello world"
    response = client.post(
        "/api/parse",
        files={"file": ("test.txt", content, "text/plain")},
    )
    assert response.status_code == 200
    assert response.json()["char_count"] == len("Hello world")
