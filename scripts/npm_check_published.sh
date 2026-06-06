#!/usr/bin/env bash
set -euo pipefail

# Check which non-private packages have changes since their last npm publish.
#
# Uses the gitHead field from the npm registry to determine the commit
# each package was last published from, then diffs against HEAD.
# Falls back to SLSA provenance attestations when gitHead is missing.
#
# Usage:
#   ./scripts/npm_check_published.sh              # check all packages
#   ./scripts/npm_check_published.sh kolibri # check a specific package

has_changes=0

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"

check_package() {
  local pkg_dir="$1"
  local name version private git_head npm_version changed_files

  [ -f "$pkg_dir/package.json" ] || return 0

  name=$(node -e "console.log(require('./$pkg_dir/package.json').name)")
  private=$(node -e "console.log(require('./$pkg_dir/package.json').private || false)")
  version=$(node -e "console.log(require('./$pkg_dir/package.json').version)")

  if [ "$private" = "true" ]; then
    return 0
  fi

  npm_version=$(npm view "$name" version 2>/dev/null) || {
    echo "⚠️  $name — not found on npm (local version: $version)"
    return 0
  }

  git_head=$(npm view "$name" gitHead 2>/dev/null)

  if [ -z "$git_head" ]; then
    # Fall back to SLSA provenance attestation
    git_head=$("$SCRIPTS_DIR/npm_provenance.sh" "$name" "$npm_version" 2>/dev/null | grep 'Commit:' | awk '{print $2}') || true
    if [ -z "$git_head" ]; then
      echo "⚠️  $name — no gitHead or provenance for ${name}@${npm_version}"
      return 0
    fi
  fi

  if ! git cat-file -e "$git_head" 2>/dev/null; then
    echo "⚠️  $name — published commit $git_head not found in repo"
    return 0
  fi

  changed_files=$(git diff --name-only "$git_head"..HEAD -- "$pkg_dir")

  if [ -n "$changed_files" ]; then
    local count
    count=$(echo "$changed_files" | wc -l)
    echo "📦 $name (published: $npm_version, local: $version) — $count file(s) changed since $git_head"
    echo "$changed_files" | sed 's/^/    /'
    echo
    has_changes=1
  fi
}

if [ $# -ge 1 ]; then
  # Find the directory for the named package
  found=0
  for pkg_dir in packages/*/; do
    [ -f "$pkg_dir/package.json" ] || continue
    name=$(node -e "console.log(require('./$pkg_dir/package.json').name)")
    if [ "$name" = "$1" ]; then
      check_package "$pkg_dir"
      found=1
      break
    fi
  done
  if [ "$found" = "0" ]; then
    echo "Error: package '$1' not found in packages/"
    exit 1
  fi
else
  for pkg_dir in packages/*/; do
    check_package "$pkg_dir"
  done
fi

if [ "$has_changes" = "0" ]; then
  echo "✅ All packages are up-to-date with npm"
fi

exit "$has_changes"
