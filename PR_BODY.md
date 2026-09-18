---
title: Restore the saved Android location's fragment without sending it through the server
---

## Summary

Signing out on Android saved `/en/auth/#/signin`, and the next launch replayed it as `next=`. A browser carries the request URL's fragment onto a redirect whose `Location` has none, so the app-key re-login's 302 landed `#/signin` on `/en/device/` — a route the Device router does not have, rendering nothing.

`next` now carries path and query only. The fragment is put back client-side in `onPageFinished`, and only when the served page is the one it was saved for.

Both layers are load-bearing. The split stops a fresh sign-out leaking `#/signin` onto `/en/device/`. A device that already saved `/en/device/#/signin` — the state every reporter is in — restores that fragment onto the path it genuinely belongs to, so only the Device catch-all route gets it off `#/signin`.

## References

Fixes #15232.

## Reviewer guidance

1. Android, `Group learning > Full device > new non-formal facility`: at `Device > Channels` sign out, force-stop, relaunch — Channels renders.
2. Android, `Setup Wizard > On my own`: reach a deep Library route, force-stop, relaunch — the same route returns.
3. Any browser, signed in as a superuser: `/en/device/#/signin` redirects to `/en/device/#/content` — the upgrade path for an already-affected device.

Acceptance criteria left unverified:

| Criterion | Why |
| --- | --- |
| Sign out, force-close, relaunch renders the Device page | Needs a device; the emulator SIGSEGVs mid-boot on this host in all eight configurations tried. |
| `Setup Wizard > On my own` then relaunch still works | Same blocker. |

Open risks:

- No repro ever captured the WebView console, so the fragment-inheritance diagnosis rests on the access logs and code reading.
- Robolectric cannot model fragment inheritance, so the tests pin that no fragment enters `next` and that a restore fires only on the page it was saved for — not the white screen itself.
- The restore runs after the splash hides, so step 2 may show one frame of the page's default route before it jumps.

## AI usage

Used Claude Code to diagnose the fragment leak from the issue's access logs and to write the fix test-first. Verified with the Android JVM suite, the Jest device suite, and prek.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
