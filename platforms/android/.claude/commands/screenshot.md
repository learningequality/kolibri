---
description: Run the Android visual inspect-act loop against the running emulator
---

Drive the Kolibri Android app on the connected emulator using the visual
inspect-act loop documented in `platforms/android/AGENTS.md` (section 3).

Work from `platforms/android/`. For each step, capture the screen, read it,
act, then re-capture to verify the UI changed as expected before continuing.

Goal for this run: $ARGUMENTS

## Loop

1. **Capture the screen**

   ```bash
   mkdir -p /tmp/claude
   adb exec-out screencap -p > /tmp/claude/screenshot.png
   ```

   Read `/tmp/claude/screenshot.png` to see the current state.

2. **Inspect** — pick the tool by what is on screen:
   - Kolibri WebView UI (buttons, forms, nav, text) → `python3 scripts/cdp_helper.py dump`
   - Native Android dialog (permissions, system prompts, rounded-corner overlays)
     → `adb shell uiautomator dump /sdcard/window_dump.xml && adb shell cat /sdcard/window_dump.xml`

3. **Interact**
   - WebView elements — click by text via CDP (no coordinate math):
     `python3 scripts/cdp_helper.py click "CONTINUE"`
   - Native elements — tap the centre of the uiautomator `bounds`:
     `adb shell input tap <x> <y>`
   - Other input: `adb shell input text "..."`, `adb shell input swipe ...`,
     `adb shell input keyevent <code>` (4=BACK, 66=ENTER, 3=HOME).

4. **Verify** — re-capture with step 1 and confirm the expected change before
   the next action. If the app misbehaves, inspect logs with `make logcat`
   (or `adb logcat -s python.stderr:V` for Python import errors).

Repeat until the goal above is met, then report what you did and the final
screen state.
