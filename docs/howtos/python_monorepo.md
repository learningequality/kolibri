# Adding a Python member package

Kolibri's Python code is organized as a [uv workspace](https://docs.astral.sh/uv/concepts/projects/workspaces/). The main `kolibri` package is the workspace root; additional packages live under `python_packages/`.

## Adding a new package

1. Create `python_packages/<package-name>/` with its own `pyproject.toml` — a normal, independently-buildable Python package (own `[build-system]`, own static `version`, own dependencies).
2. If it depends on `kolibri` itself, resolve that dependency against this workspace instead of PyPI:
   ```toml
   [tool.uv.sources]
   kolibri = { workspace = true }
   ```
3. No change is needed to the root `pyproject.toml` — its `[tool.uv.workspace]` `members` list already includes the glob `python_packages/*`, so any new package directory under it is picked up automatically.
4. Run `uv sync --group dev` at the repo root to update the shared lockfile.
5. Run `uv sync --group dev --all-packages` to install the new package into the shared workspace venv. `--all-packages` is required — a plain `uv sync` (or `uv sync --package <package-name>`) scopes the sync to a single project and drops root Kolibri's own runtime dependencies (Django, Click, etc.) from the shared venv.
6. Add a test job for it in `.github/workflows/tox.yml`, in the Stage 2 section (see "CI cascade" below) — model it on the `sync_extras_plugin_tests` job, and add the new job's id to `stage2_required_checks`'s `needs:` list in the same file. A job left out of that list can fail without blocking merge, since branch protection only requires `stage2_required_checks` itself to pass.
7. Add the package's import name to `known-first-party` in root `pyproject.toml`'s `[tool.ruff.lint.isort]` table, so ruff sorts its own imports as first-party rather than third-party.

Member package versions are independent of each other and of the main `kolibri` package — there's no enforcement linking them. Use a static `version = "x.y.z"` field, not `setuptools-scm`-derived dynamic versioning: this repo's git tags are Kolibri's own release tags, so dynamic versioning inside the workspace would report Kolibri's version instead of the package's own.

## Marking a package as publishable

By default, a package under `python_packages/` is workspace-only — nothing publishes it. To publish it to PyPI:

1. Add a `Makefile` with a `dist` target that builds the wheel: `uv build -o dist` for a backend-only package, or (for a package with a frontend bundle) `pnpm run build && pnpm run compress && uv build -o dist` — see `python_packages/kolibri-sentry-plugin/Makefile` for the frontend case. `scripts/pypi_publish.sh` calls `make -C python_packages/<name> dist` and publishes whatever lands in that member's own `dist/`.
2. Add its `pyproject.toml` path to the `paths:` filter in `.github/workflows/pypi_packages_publish.yml`'s `push` trigger.
3. Add its name to the `workflow_dispatch.inputs.pypi_package.options` list in the same file.
4. Register a pending trusted publisher on PyPI and TestPyPI (see the "Python packages" section of [the release process docs](../release_process.rst)) before merging.

## CI cascade

Python tests run in two stages (`.github/workflows/tox.yml`):

- **Stage 1** (blocking, fast feedback): core Kolibri tests on Python 3.10, and Postgres tests. Runs in parallel.
- **Stage 2** (gated on Stage 1 via `needs:`): the rest of the Python version matrix, plus a test job per publishable member package. Acts as a broader safety net — it rarely fails once Stage 1 passes, but still gates merge.

Both stages are required checks in branch protection. Lint, wheel build, and JS tests are unaffected — they run in their own workflows, in parallel with Stage 1.
