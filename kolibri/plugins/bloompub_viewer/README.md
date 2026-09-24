# BloomPub viewer

Renders BloomPub books inside the Kolibri sandbox.

## Vendored Bloom Player

`static/bloom/` is built from [learningequality/bloom-player](https://github.com/learningequality/bloom-player), a fork of [BloomBooks/bloom-player](https://github.com/BloomBooks/bloom-player), using the fork's `patched` default branch.

To regenerate, clone the fork, run `pnpm run build` within it, and copy everything from its `dist` into `static/bloom/`. Previously existing hash-named files can be deleted.

Then check `static/bloom/bloomplayer.htm` still carries the `window.parent.sandbox.initializeIframe(window)` script in its `<head>`, re-adding it if the copy overwrote it. `test/test_vendored_player.py` fails if it is missing. It is the only path by which the sandbox installs its shims on the player window, and losing it fails silently: books still render and page reads still flow over postMessage, but storage writes go to the sandbox origin instead of the learner's content state.

There is no pinned upstream ref and no automated update path. Replacing this with a reproducible build from upstream is tracked in [#15039](https://github.com/learningequality/kolibri/issues/15039).
