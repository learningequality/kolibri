"""
Browser smoke test for Kolibri.

Starts Kolibri, navigates the "On my own" setup wizard using Playwright,
and takes a screenshot of the post-setup landing page.

Environment variables:
    KOLIBRI_HOME: Path to Kolibri home directory (optional)
    KOLIBRI_PORT: Port to run Kolibri on (default: 8080)
    SCREENSHOT_PATH: Path to save the screenshot (default: screenshot.png)
"""

import logging
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)

KOLIBRI_PORT = os.environ.get("KOLIBRI_PORT", "8080")
KOLIBRI_URL = f"http://localhost:{KOLIBRI_PORT}"
STARTUP_TIMEOUT = 120  # seconds to wait for Kolibri to start
SCREENSHOT_PATH = os.environ.get("SCREENSHOT_PATH", "screenshot.png")


def wait_for_kolibri(process, timeout=STARTUP_TIMEOUT):
    """Wait for Kolibri server to become accessible."""
    start = time.time()
    while time.time() - start < timeout:
        ret = process.poll()
        if ret is not None:
            raise RuntimeError(f"Kolibri process exited prematurely with code {ret}")
        try:
            urllib.request.urlopen(KOLIBRI_URL, timeout=5)
            return
        except (urllib.error.URLError, ConnectionError, OSError):
            time.sleep(2)
    raise TimeoutError(f"Kolibri did not start within {timeout} seconds")


def run_smoke_test():
    """Start Kolibri and navigate the setup wizard."""
    # Start Kolibri as a subprocess, inheriting stdout/stderr so CI captures logs
    env = os.environ.copy()
    env["KOLIBRI_RUN_MODE"] = "integration-test"
    kolibri_process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "kolibri",
            "start",
            "--foreground",
            f"--port={KOLIBRI_PORT}",
        ],
        env=env,
    )

    try:
        logger.info("Waiting for Kolibri to start...")
        wait_for_kolibri(kolibri_process)
        logger.info("Kolibri is ready.")

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            try:
                # Navigate to Kolibri
                page.goto(KOLIBRI_URL, wait_until="domcontentloaded")
                logger.info(f"Loaded: {page.url}")

                # Step 1: "How are you using Kolibri?" — "On my own" is pre-selected
                page.get_by_role("button", name="Continue").click()
                logger.info("Step 1: Clicked Continue (How are you using Kolibri?)")

                # Wait for the language selection step to appear via URL
                page.wait_for_url(lambda url: "default-language" in url, timeout=30000)
                # Step 2: "Please select the default language for Kolibri" — English is default
                page.get_by_role("button", name="Continue").click()
                logger.info("Step 2: Clicked Continue (Default language)")

                # Wait for the credentials form to appear
                page.get_by_label("Full name").wait_for(state="visible")
                # Step 3: "Create super admin" — fill credentials
                page.get_by_label("Full name").fill("Smoke Test Admin")
                page.get_by_label("Username").fill("admin")
                page.get_by_label("Password", exact=True).fill("test1234")
                page.get_by_label("Re-enter password").fill("test1234")
                page.get_by_role("button", name="Continue").click()
                logger.info("Step 3: Filled credentials and clicked Continue")

                # Step 4: "Setting up Kolibri" — wait for redirect to the learn page
                page.wait_for_url(
                    lambda url: "/learn" in url,
                    timeout=60000,
                )
                # Wait for the page to fully load (all resources including CSS/JS)
                page.wait_for_load_state("load")
                # Wait for the Library page to finish loading.
                # The "nothing in library" label only renders after loading
                # completes on a fresh install with no imported channels.
                page.get_by_text("There is nothing in your library yet").wait_for(
                    state="visible", timeout=30000
                )
                logger.info(f"Setup complete, landed on: {page.url}")

                # Take screenshot of the post-setup landing page
                page.screenshot(path=SCREENSHOT_PATH, full_page=False)
                logger.info(f"Screenshot saved to {SCREENSHOT_PATH}")

            except PlaywrightError as e:
                # Take a screenshot of whatever state we're in for debugging
                try:
                    page.screenshot(path=SCREENSHOT_PATH, full_page=False)
                    logger.info(f"Error screenshot saved to {SCREENSHOT_PATH}")
                except Exception:
                    pass
                raise e
            finally:
                browser.close()

    finally:
        kolibri_process.terminate()
        try:
            kolibri_process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            kolibri_process.kill()
            kolibri_process.wait()
        logger.info("Kolibri process stopped.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    run_smoke_test()
