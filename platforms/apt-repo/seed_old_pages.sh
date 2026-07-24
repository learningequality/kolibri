#!/usr/bin/env bash
# RUN ONCE — cutover-release only. NOT part of the ongoing release.
#
# Pushes a single cutover .deb into the old, soon-to-be-archived github.io
# Pages repo(s) so existing consumers still on the old URL receive it on their
# next `apt upgrade` and self-migrate (the cutover .deb's postinst rewrites the
# source to apt.learningequality.org — see migrate-apt-source.sh).
#
# It does a read-modify-write against each old repo's OWN committed conf/: it
# clones the branch, `reprepro includedeb stable`s the .deb, commits, and pushes.
# Prior packages persist. reprepro re-signs Release using the SignWith already
# in that repo's conf/distributions, so the matching secret key must be imported
# into the gpg keyring (with its passphrase preset, as the publish workflow does).
#
# Usage:
#   seed_old_pages.sh --deb PATH --repo NAME [--repo NAME ...]
#
# --repo NAME    one of kolibri-server / kolibri-installer-debian (repeatable)
#
# Env:
#   KOLIBRI_SEED_REMOTE_BASE  git remote base (default git@github.com:learningequality);
#                             tests point it at local bare repos (file://...).
set -euo pipefail

BRANCH="gh-pages"

DEB=""
REPOS=()
REMOTE_BASE="${KOLIBRI_SEED_REMOTE_BASE:-git@github.com:learningequality}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --deb)  DEB="$2"; shift 2 ;;
    --repo) REPOS+=("$2"); shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

[ -n "$DEB" ]        || { echo "usage: seed_old_pages.sh --deb PATH --repo NAME [--repo NAME ...]" >&2; exit 2; }
[ -f "$DEB" ]        || { echo "no such .deb: $DEB" >&2; exit 2; }
[ "${#REPOS[@]}" -gt 0 ] || { echo "at least one --repo is required" >&2; exit 2; }
DEB=$(CDPATH= cd -- "$(dirname -- "$DEB")" && pwd)/$(basename -- "$DEB")

echo ">> RUN ONCE: seeding the cutover release into the OLD github.io Pages repo(s)." >&2

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

for repo in "${REPOS[@]}"; do
  echo ">> seeding $repo ($BRANCH)" >&2
  clone="$WORK/$repo"
  git clone --quiet --branch "$BRANCH" --single-branch "$REMOTE_BASE/$repo" "$clone"

  # reprepro exits non-zero when the version is already present (idempotent
  # second run) — log it, don't abort.
  reprepro -b "$clone" includedeb stable "$DEB" \
    || echo ">> $DEB already present in $repo — skipping" >&2

  # Commit only when reprepro actually changed the tree; push is a harmless
  # no-op on an unchanged branch.
  git -C "$clone" add -A
  if git -C "$clone" diff --cached --quiet; then
    echo ">> no changes to push for $repo" >&2
  else
    git -C "$clone" -c user.email=dev@learningequality.org -c user.name="Kolibri Bot" \
      commit --quiet -m "Seed cutover release into $repo"
  fi
  git -C "$clone" push --quiet origin "$BRANCH"
done

echo ">> done" >&2
