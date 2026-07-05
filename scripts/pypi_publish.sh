#!/usr/bin/env bash
set -euo pipefail

# Publish Python packages under python_packages/ to PyPI.
#
# Usage:
#   ./scripts/pypi_publish.sh                              # auto-detect and publish all changed packages
#   ./scripts/pypi_publish.sh kolibri-sync-extras-plugin    # publish a specific package
#
# Environment:
#   PYPI_TARGET=testpypi   publish to TestPyPI instead of PyPI

JSON_HOST="https://pypi.org/pypi"
PUBLISH_ARGS=()
if [ "${PYPI_TARGET:-}" = "testpypi" ]; then
  JSON_HOST="https://test.pypi.org/pypi"
  PUBLISH_ARGS=(--publish-url "https://test.pypi.org/legacy/")
fi

# Elements are "name:version" pairs so the build/publish loop below doesn't
# need to re-run `uv version` for packages already resolved during detection.
TO_PUBLISH=()

if [ $# -ge 1 ]; then
  TO_PUBLISH=("$1:$(uv version --package "$1" --short)")
  echo "Publishing $1"
else
  for pkg_dir in python_packages/*/; do
    [ -f "$pkg_dir/pyproject.toml" ] || continue
    name=$(basename "$pkg_dir")
    repo_version=$(uv version --package "$name" --short)

    # Unlike scripts/npm_publish.sh, a 404 here is never skipped in CI: npm
    # requires an existing package before a trusted publisher can be attached,
    # but PyPI/TestPyPI support registering a *pending* trusted publisher for
    # a project that doesn't exist yet, so the first publish can go out
    # through this same automated path.
    published_version=$(curl -sf "$JSON_HOST/$name/json" | jq -r '.info.version') || published_version=""

    if [ -z "$published_version" ]; then
      echo "Will publish $name: first publish ($repo_version)"
      TO_PUBLISH+=("$name:$repo_version")
    elif [ "$repo_version" != "$published_version" ] &&
      [ "$(printf '%s\n%s\n' "$repo_version" "$published_version" | sort -V | tail -1)" = "$repo_version" ]; then
      echo "Will publish $name: $published_version → $repo_version"
      TO_PUBLISH+=("$name:$repo_version")
    else
      echo "Skipping $name ($repo_version is not newer than $published_version)"
    fi
  done
fi

if [ ${#TO_PUBLISH[@]} -eq 0 ]; then
  echo "No packages need publishing"
  exit 0
fi

SUMMARY_FILE="${PUBLISH_SUMMARY:-publish_summary.md}"
{
  echo "### Published PyPI packages"
  echo ""
  echo "| Package | Version |"
  echo "|-|-|"
} > "$SUMMARY_FILE"

for entry in "${TO_PUBLISH[@]}"; do
  name="${entry%:*}"
  version="${entry##*:}"
  echo "Building $name $version"
  make -C "python_packages/$name" dist
  echo "Publishing $name $version"
  uv publish "${PUBLISH_ARGS[@]}" "python_packages/$name/dist"/*
  echo "| [$name](https://pypi.org/project/$name/) | $version |" >> "$SUMMARY_FILE"
done

cat "$SUMMARY_FILE"
