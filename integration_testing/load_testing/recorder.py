"""
Playwright-based flow recording utilities.
"""

import subprocess

from logger import info
from logger import plain
from logger import success
from logger import warning
from playwright.sync_api import sync_playwright


def capture_manual_flow(server_url, output_har):
    """
    Launch Chromium with HAR recording for manual interaction.

    User manually completes the lesson flow while browser records all network traffic.

    Args:
        server_url: Kolibri server URL
        output_har: Path to save HAR file
        lesson_metadata: Optional dict with lesson info for display

    Returns:
        str: Path to generated HAR file
    """
    info("\n" + "=" * 60)
    info("MANUAL FLOW RECORDING")
    info("=" * 60)
    info(f"\n🎬 Opening browser to {server_url}")
    info("\nPlease complete the following steps:")
    plain("1. Login as any load_test_X user (no password needed)")
    plain("2. Navigate to 'Load Test Class'")
    plain("3. Open 'Load Test Lesson - All Types'")
    plain("4. Interact with EACH resource type:")
    plain("   - Click on each resource")
    plain("   - Spend a few seconds on each (play video, read, answer questions)")
    plain("   - Navigate back to lesson between resources")
    plain("5. Close the browser when done")

    warning("All network requests will be recorded to HAR file")
    info("=" * 60 + "\n")

    # Auto-install playwright browsers if needed
    # This prevents confusing error backtraces if browsers aren't installed
    try:
        info("Checking Playwright browser installation...")
        subprocess.run(
            ["playwright", "install"],
            check=False,
            capture_output=True,
            timeout=300,
        )
    except Exception:
        # Installation may have already happened or failed - continue anyway
        pass

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            record_har_path=output_har,
            record_har_mode="minimal",  # Minimize HAR size
        )
        page = context.new_page()

        # Navigate to Kolibri
        page.goto(server_url)

        # Wait for user to close browser
        try:
            page.wait_for_event("close", timeout=0)  # No timeout
        except Exception:
            # Browser closed
            pass

        context.close()
        browser.close()

    # Strip response data from HAR file to reduce size and avoid version-specific content
    _strip_har_responses(output_har)

    success(f"HAR file saved to: {output_har}")
    return output_har


def _strip_har_responses(har_path):
    """
    Strip response content from HAR file to reduce size.

    Response data is not needed for load testing - we only care about
    making the requests, not validating the responses.

    Args:
        har_path: Path to HAR file to strip
    """
    import json

    with open(har_path) as f:
        har = json.load(f)

    # Remove response content from all entries
    for entry in har["log"]["entries"]:
        if "response" in entry:
            del entry["response"]

    # Write back stripped HAR
    with open(har_path, "w") as f:
        json.dump(har, f, indent=2)

    info("Stripped response data from HAR file")
