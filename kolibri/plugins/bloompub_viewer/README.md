# BloomPub viewer

Renders BloomPub books inside the Kolibri sandbox.

## Bloom Player build

`static/bloom/` is built from [BloomBooks/bloom-player](https://github.com/BloomBooks/bloom-player) at the commit pinned in `bloom_build/.bloom-player-commit-sha`, with Kolibri's modifications applied from `bloom_build/patches/`.

To rebuild, run on the Node version in upstream's `package.json` `volta.node` at the pinned commit; the build fails naming it otherwise. Kolibri's own `volta` pin is older, so override it:

```bash
volta run --node <upstream volta.node> pnpm --filter kolibri-bloompub-viewer-plugin run build-bloom
```

The build has two stages:

1. `bloom_build/buildBloomPlayerVendor.js` fetches the pinned commit into a temporary git repo and applies each patch with `git apply`. It then runs upstream's tests and `build:standalone` with upstream's pinned pnpm, and copies the built JS and CSS to `bloom_build/vendor/`.
2. `bloom_build/webpack.config.bloom.js` transpiles that build to Kolibri's browser targets and writes it to `static/bloom/`. The host page comes from `bloom_build/bloomplayer.htm`, not upstream's.

Rebuilding the same pin gives byte-identical output.

`bloomplayer.htm` must keep the `window.parent.sandbox.initializeIframe(window)` script in its `<head>`; `test/test_vendored_player.py` fails without it. Losing it fails silently: books still render, but storage writes go to the sandbox origin instead of the learner's content state.

When upstream publishes a release newer than the pin, the `build-bloom-player` job in `.github/workflows/dependency_updates.yml` rebuilds at its commit with no write token, and `update-bloom-player` opens a PR with the bumped pin and that build. A patch that no longer applies fails the build job.

### Refreshing the patches

Each patch is one Kolibri modification. When one stops applying:

```bash
git clone https://github.com/BloomBooks/bloom-player && cd bloom-player
git checkout <new pinned sha>
git am -3 /path/to/bloom_build/patches/*.patch  # resolve conflicts, then git am --continue
rm /path/to/bloom_build/patches/*.patch
git format-patch --zero-commit --no-signature <new pinned sha>..HEAD -o /path/to/bloom_build/patches/
```
