# H5P viewer

Renders H5P content inside the Kolibri sandbox.

## xAPI

`xAPIShim` exposes `window.xAPI` on the content window, and is how H5P interactions are logged. It offers a Promise-based subset of the [XAPIWrapper JavaScript library API](https://github.com/adlnet/xAPIWrapper), limited to sending and querying statements, state, activity profiles and agents.

Only this handler installs it, so H5P is the only content type that gets `window.xAPI`.

## Vendored H5P library

`static/h5p/` is built from [h5p/h5p-php-library](https://github.com/h5p/h5p-php-library). The upstream commit is pinned in `h5p_build/.h5p-commit-sha`.

To update by hand, write the desired commit SHA to that file and run:

```bash
pnpm --filter kolibri-h5p-viewer-plugin run build-h5p
```

The `update-h5p` job in `.github/workflows/dependency_updates.yml` does this automatically, opening a PR when upstream moves.
