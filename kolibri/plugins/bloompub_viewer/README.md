# BloomPub viewer

Renders BloomPub books inside the Kolibri sandbox.

## Vendored Bloom Player

`static/bloom/` is built from [learningequality/bloom-player](https://github.com/learningequality/bloom-player), a fork of [BloomBooks/bloom-player](https://github.com/BloomBooks/bloom-player), using the fork's `patched` default branch.

To regenerate, clone the fork, run `pnpm run build` within it, and copy everything from its `dist` into `static/bloom/`. Previously existing hash-named files can be deleted.

There is no pinned upstream ref and no automated update path. Replacing this with a reproducible build from upstream is tracked in [#15039](https://github.com/learningequality/kolibri/issues/15039).
