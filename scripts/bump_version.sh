#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <package-name> <patch|minor|major>"
  echo ""
  echo "Examples:"
  echo "  $0 kolibri-format patch"
  echo "  $0 kolibri-format minor"
  echo "  $0 kolibri-format major"
  exit 1
fi

package="$1"
bump="$2"

if [[ "$bump" != "patch" && "$bump" != "minor" && "$bump" != "major" ]]; then
  echo "Error: bump type must be patch, minor, or major (got: $bump)"
  exit 1
fi

# Verify the package exists in the workspace
pkg_dir="packages/$package"
if [ ! -f "$pkg_dir/package.json" ]; then
  echo "Error: $pkg_dir/package.json not found"
  exit 1
fi

old_version=$(node -e "console.log(require('./$pkg_dir/package.json').version)")

pnpm --filter "$package" exec npm version "$bump" --no-git-tag-version

new_version=$(node -e "console.log(require('./$pkg_dir/package.json').version)")
echo "$package: $old_version → $new_version"
