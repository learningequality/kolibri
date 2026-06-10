#!/usr/bin/env python3
"""
CDP helper for inspecting and interacting with Kolibri's WebView.

Uses Chrome DevTools Protocol over ADB to access the WebView's DOM,
which is not visible to uiautomator. Requires the `websockets` Python
package (`uv pip install websockets`).

Usage:
    python3 scripts/cdp_helper.py dump              # List visible DOM elements
    python3 scripts/cdp_helper.py click CONTINUE    # Click element by text
    python3 scripts/cdp_helper.py js "document.title"  # Run arbitrary JS
"""

import asyncio
import json
import os
import subprocess
import sys
import urllib.request

import websockets


def get_ws_url():
    """Find the WebView DevTools WebSocket URL via ADB."""
    output = subprocess.check_output(
        ["adb", "shell", "cat /proc/net/unix"],
        text=True,
    )
    socket_name = None
    for line in output.splitlines():
        if "webview_devtools_remote_" in line:
            if "@" not in line:
                continue
            socket_name = line.split("@")[1].strip()
            break
    if not socket_name:
        print(
            "ERROR: No WebView devtools socket found. Is the app running?",
            file=sys.stderr,
        )
        sys.exit(1)

    port = os.environ.get("CDP_PORT", "9222")
    subprocess.run(
        ["adb", "forward", f"tcp:{port}", f"localabstract:{socket_name}"],
        capture_output=True,
        check=True,
    )
    with urllib.request.urlopen(f"http://localhost:{port}/json") as resp:
        pages = json.loads(resp.read())
    if not pages:
        print("ERROR: No WebView pages found", file=sys.stderr)
        sys.exit(1)
    ws_url = pages[0].get("webSocketDebuggerUrl")
    if not ws_url:
        print(
            "ERROR: Page has no webSocketDebuggerUrl — is the WebView debuggable?",
            file=sys.stderr,
        )
        sys.exit(1)
    return ws_url


async def run_js(ws_url, js):
    """Send a JavaScript expression to the WebView via CDP and return the result."""
    async with websockets.connect(ws_url) as ws:
        await ws.send(
            json.dumps(
                {
                    "id": 1,
                    "method": "Runtime.evaluate",
                    "params": {"expression": js, "returnByValue": True},
                }
            )
        )
        resp = json.loads(await ws.recv())
        inner = resp.get("result", {})
        if inner.get("exceptionDetails"):
            details = inner["exceptionDetails"]
            print(
                f"CDP exception: {details.get('text', details)}",
                file=sys.stderr,
            )
            return None
        result = inner.get("result", {})
        if result.get("type") == "undefined":
            return None
        return result.get("value")


def dump_elements(ws_url):
    """Print all visible DOM elements with their text, id, classes, and role."""
    js = """JSON.stringify(
      Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .map(el => ({
          tag: el.tagName.toLowerCase(),
          id: el.id || undefined,
          text: (el.innerText || '').trim().substring(0, 150) || undefined,
          classes: el.className || undefined,
          role: el.getAttribute('role') || undefined,
          type: el.getAttribute('type') || undefined
        }))
        .filter(el => el.text || el.id || el.role)
    )"""
    result = asyncio.run(run_js(ws_url, js))
    if result is None:
        print("ERROR: Failed to retrieve DOM elements", file=sys.stderr)
        return
    elements = json.loads(result)
    for el in elements:
        el = {k: v for k, v in el.items() if v}
        print(json.dumps(el))


def click_by_text(ws_url, text):
    """Click the first interactive element matching the given text."""
    safe_text = json.dumps(text)
    js = f"""
      (function() {{
        const target = {safe_text};
        const els = Array.from(document.querySelectorAll(
          'button, a, [role="button"], label, input'
        ));
        const el = els.find(e => e.innerText && e.innerText.trim() === target);
        if (el) {{ el.click(); return 'clicked: ' + target; }}
        return 'not found: ' + target;
      }})()
    """
    result = asyncio.run(run_js(ws_url, js))
    print(result)


def main():
    ws_url = get_ws_url()
    cmd = sys.argv[1] if len(sys.argv) > 1 else "dump"

    if cmd == "dump":
        dump_elements(ws_url)
    elif cmd == "click":
        if len(sys.argv) < 3:
            print("Usage: cdp_helper.py click <text>", file=sys.stderr)
            sys.exit(1)
        click_by_text(ws_url, " ".join(sys.argv[2:]))
    elif cmd == "js":
        if len(sys.argv) < 3:
            print("Usage: cdp_helper.py js <expression>", file=sys.stderr)
            sys.exit(1)
        result = asyncio.run(run_js(ws_url, " ".join(sys.argv[2:])))
        print(result)
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        print("Commands: dump, click <text>, js <expression>", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
