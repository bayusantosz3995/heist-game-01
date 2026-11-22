"""Playwright check for BLUEPRINT: loads every ?shot= scene plus a live play
session in desktop Chromium, fails on any console or page error, and takes
the 1280x800 screenshots. Run: <venv>/bin/python test-playwright.py"""
import json
import os
import subprocess
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 8091
BASE = f"http://127.0.0.1:{PORT}"

sys.path.insert(0, os.path.join(ROOT))
from playwright.sync_api import sync_playwright  # noqa: E402


def wait_for_server(timeout=15):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(BASE + "/index.html", timeout=2)
            return True
        except Exception:
            time.sleep(0.3)
    return False


def main():
    server = subprocess.Popen(
        ["node", "serve.ts", "--port", str(PORT)],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    errors = []
    try:
        if not wait_for_server():
            print("FAIL: serve.ts did not come up")
            return 1
        with open(os.path.join(ROOT, "shots.json")) as f:
            shots = json.load(f)

        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            console_errors = []
            page_errors = []
            page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: page_errors.append(str(e)))

            for shot in shots:
                page.goto(BASE + "/index.html" + shot["query"])
                page.wait_for_function("window.__shotReady === true", timeout=15000)
                time.sleep(0.3)
                out = os.path.join(ROOT, "screenshots", shot["name"])
                page.screenshot(path=out, type="jpeg", quality=82)
                size = os.path.getsize(out)
                print(f"shot {shot['name']}: {size} bytes")
                if size > 262144:
                    print(f"  over 256 KiB, re-shooting at quality 70")
                    page.screenshot(path=out, type="jpeg", quality=70)
                    size = os.path.getsize(out)
                    print(f"  now {size} bytes")
                if size > 262144:
                    errors.append(f"{shot['name']} still over 256 KiB")

            # Live play: title -> briefing -> play, move, use a tool, pause.
            page.goto(BASE + "/index.html")
            page.wait_for_timeout(500)
            page.keyboard.press("Enter")
            page.wait_for_timeout(300)
            page.keyboard.press("Enter")
            page.wait_for_timeout(300)
            page.keyboard.down("KeyD")
            page.wait_for_timeout(1200)
            page.keyboard.up("KeyD")
            page.keyboard.down("KeyW")
            page.wait_for_timeout(800)
            page.keyboard.up("KeyW")
            page.keyboard.press("KeyQ")
            page.wait_for_timeout(200)
            page.keyboard.press("KeyP")
            page.wait_for_timeout(200)
            page.keyboard.press("KeyP")
            page.wait_for_timeout(500)
            browser.close()

        if console_errors:
            errors.append(f"console errors: {console_errors[:5]}")
        if page_errors:
            errors.append(f"page errors: {page_errors[:5]}")
        if errors:
            for e in errors:
                print("FAIL:", e)
            return 1
        print("PASS: 4 shots taken, 0 console errors, 0 page errors (shots + live play)")
        return 0
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()


if __name__ == "__main__":
    sys.exit(main())
