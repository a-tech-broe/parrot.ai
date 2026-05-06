#!/usr/bin/env python3
"""Smoke test suite — runs against a live Parrot deployment."""
import argparse
import sys
import requests
from junit_xml import TestCase, TestSuite


def check(name: str, fn) -> TestCase:
    tc = TestCase(name, classname="smoke")
    try:
        fn()
    except AssertionError as e:
        tc.add_failure_info(message=str(e))
    except Exception as e:
        tc.add_error_info(message=f"{type(e).__name__}: {e}")
    return tc


def run(base_url: str) -> list[TestCase]:
    base = base_url.rstrip("/")
    cases = []

    # 1 — Home page returns HTML
    def test_home():
        r = requests.get(f"{base}/", timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        assert "text/html" in r.headers.get("content-type", ""), "Response is not HTML"

    cases.append(check("GET / returns HTML page", test_home))

    # 2 — API rejects unsupported file type
    def test_bad_format():
        r = requests.post(
            f"{base}/api/parse",
            files={"file": ("doc.xyz", b"data", "application/octet-stream")},
            timeout=10,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        assert "detail" in r.json()

    cases.append(check("API rejects unsupported format", test_bad_format))

    # 3 — API parses plain text correctly
    def test_parse_txt():
        payload = b"Smoke test document with five words here."
        r = requests.post(
            f"{base}/api/parse",
            files={"file": ("smoke.txt", payload, "text/plain")},
            timeout=15,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("word_count", 0) > 0, "word_count is 0"
        assert len(data.get("text", "")) > 0, "text is empty"

    cases.append(check("API parses TXT and returns text", test_parse_txt))

    # 4 — API rejects empty document
    def test_empty_doc():
        r = requests.post(
            f"{base}/api/parse",
            files={"file": ("empty.txt", b"   ", "text/plain")},
            timeout=10,
        )
        assert r.status_code == 422, f"Expected 422, got {r.status_code}"

    cases.append(check("API rejects empty document", test_empty_doc))

    # 5 — Response time is acceptable
    def test_response_time():
        import time
        start = time.perf_counter()
        requests.get(f"{base}/", timeout=10)
        elapsed = time.perf_counter() - start
        assert elapsed < 3.0, f"Home page took {elapsed:.2f}s (>3s)"

    cases.append(check("Home page responds within 3s", test_response_time))

    return cases


def main():
    parser = argparse.ArgumentParser(description="Parrot smoke tests")
    parser.add_argument("--url",    required=True, help="Base URL of the deployment")
    parser.add_argument("--output", default="reports/smoke-junit.xml", help="JUnit XML output path")
    args = parser.parse_args()

    print(f"\n🦜 Parrot Smoke Tests → {args.url}\n")
    cases = run(args.url)

    passed = sum(1 for c in cases if not c.is_failure() and not c.is_error())
    total  = len(cases)

    for c in cases:
        if c.is_failure() or c.is_error():
            msg = (c.failures or c.errors or [{}])[0].get("message", "")
            print(f"  ✗ FAIL  {c.name}")
            if msg:
                print(f"         {msg}")
        else:
            print(f"  ✓ PASS  {c.name}")

    print(f"\n  {passed}/{total} passed\n")

    import os
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    with open(args.output, "w") as f:
        TestSuite.to_file(f, [TestSuite("Parrot Smoke Tests", cases)])

    print(f"  Report → {args.output}")

    if passed < total:
        sys.exit(1)


if __name__ == "__main__":
    main()
