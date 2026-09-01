# H5P viewer

Renders H5P content inside the Kolibri sandbox.

## Vendored H5P library

`static/h5p/` is built from [h5p/h5p-php-library](https://github.com/h5p/h5p-php-library). The upstream commit is pinned in `h5p_build/.h5p-commit-sha`.

To update by hand, write the desired commit SHA to that file and run:

```bash
pnpm --filter kolibri-h5p-viewer-plugin run build-h5p
```

The `update-h5p` job in `.github/workflows/dependency_updates.yml` does this automatically, opening a PR when upstream moves.
