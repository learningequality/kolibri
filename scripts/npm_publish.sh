#!/usr/bin/env bash
set -euo pipefail

# Publish npm packages.
#
# Usage:
#   ./scripts/npm_publish.sh              # auto-detect and publish all changed packages
#   ./scripts/npm_publish.sh kolibri-format  # publish a specific package

FILTER=""

if [ $# -ge 1 ]; then
  # Specific package requested
  FILTER="--filter $1"
  echo "Publishing $1"
else
  # Auto-detect packages with newer versions than npm
  for pkg_dir in packages/*/; do
    [ -f "$pkg_dir/package.json" ] || continue

    name=$(node -e "console.log(require('./$pkg_dir/package.json').name)")
    private=$(node -e "console.log(require('./$pkg_dir/package.json').private || false)")
    repo_version=$(node -e "console.log(require('./$pkg_dir/package.json').version)")

    if [ "$private" = "true" ]; then
      echo "Skipping $name (private)"
      continue
    fi

    npm_version=$(npm view "$name" version 2>/dev/null) || {
      if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
        echo "Skipping $name (not on npm — first publish must be done locally)"
        continue
      else
        echo "Will publish $name: first publish ($repo_version)"
        FILTER="$FILTER --filter $name"
        continue
      fi
    }

    is_newer=$(node -e "
      const [a, b] = ['$repo_version', '$npm_version'].map(
        v => v.split('.').map(Number)
      );
      const gt = a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2])));
      console.log(gt);
    ")

    if [ "$is_newer" = "true" ]; then
      echo "Will publish $name: $npm_version → $repo_version"
      FILTER="$FILTER --filter $name"
    else
      echo "Skipping $name ($repo_version is not newer than $npm_version)"
    fi
  done
fi

if [ -z "$FILTER" ]; then
  echo "No packages need publishing"
  exit 0
fi

echo "Filter: $FILTER"

# shellcheck disable=SC2086
pnpm $FILTER -r publish --no-git-checks

# Write a markdown summary of published packages to a file
SUMMARY_FILE="${PUBLISH_SUMMARY:-publish_summary.md}"
{
  echo "### Published npm packages"
  echo ""
  echo "| Package | Version |"
  echo "|-|-|"
  for filter_arg in $FILTER; do
    [ "$filter_arg" = "--filter" ] && continue
    pkg_dir=$(find packages -maxdepth 1 -name "$filter_arg" -type d | head -1)
    if [ -n "$pkg_dir" ] && [ -f "$pkg_dir/package.json" ]; then
      name=$(node -e "console.log(require('./$pkg_dir/package.json').name)")
      version=$(node -e "console.log(require('./$pkg_dir/package.json').version)")
      echo "| [$name](https://www.npmjs.com/package/$name) | $version |"
    fi
  done
} > "$SUMMARY_FILE"
cat "$SUMMARY_FILE"
