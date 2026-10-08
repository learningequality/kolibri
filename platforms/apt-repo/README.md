# Kolibri self-hosted APT repository

Publishing infrastructure for `https://apt.learningequality.org/` (suites `stable` and `proposed`, component `main`), replacing the `learningequality.github.io/kolibri-server/` and `…/kolibri-installer-debian/` Pages repos.

## Publishing model

A [reprepro](https://salsa.debian.org/debian/reprepro) tree on the release GCS bucket under `downloads/kolibri/apt`, with two suites:

- `proposed`: every release, prerelease or final, is published here.
- `stable`: what `kolibri-archive-keyring`'s source file names.

Each suite serves one version per package: a publish replaces the suite's previous version, older or newer. Other packages persist, because each release read-modify-writes the tree:

1. `gcloud storage rsync` the tree **down**.
2. `reprepro includedeb proposed` the new `.deb`(s), first removing any other version of the package; skip a version the suite or `stable` already serves — reprepro rejects same-version bytes that differ. A version no suite serves must keep the bytes recorded in `db/published-debs`, since the CDN may still cache its pool file. `stable` is never written.
3. Export `pubkey.asc` from the signing key.
4. Sync **up** one prefix at a time:
   - `pool` first, so no index is published naming a file that is not there yet.
   - `--checksums-only`, because reprepro rewrites `db/*.db` in place without changing size or mtime.
   - `Cache-Control` per prefix: pool objects never change once published, while a cached index served against a newer pool is a client-side hash mismatch.

`publish.sh` implements this; `repo.sh` holds the sync-down/sync-up legs it shares with `promote.sh`, and its header documents the env contract. `conf/distributions.in` is the suites template, with `SignWith` rendered in at runtime. Removing a suite from it needs `reprepro clearvanished` in the same read-modify-write; otherwise every later publish fails on the db's undefined target.

`.github/workflows/platform-apt-repo-publish.yml` runs it in CI, serialized by a static `concurrency` group so two releases cannot clobber the shared state mid-write.

The workflow never builds the `.deb` it publishes: on every release, `release_kolibri.yml` builds `kolibri` and `kolibri-server` and publishes both in one call, before the `release` approval. Dispatch it by hand with `deb-url`, space-separated release-asset URLs, to publish already-released `.deb`s; each release cut after the `proposed` suite landed uploads both.

## Promotion

`promote.sh kolibri=VERSION kolibri-server=VERSION` copies those versions from `proposed` to `stable` in one read-modify-write. `stable` serves the same `.deb` that was staged; nothing is rebuilt.

`.github/workflows/platform-apt-repo-promote.yml` runs it under the publish workflow's `concurrency` group. Approving a final release in `release_kolibri.yml` calls it with the versions just published; dispatch it by hand with the same `packages` pins. Launchpad gates neither suite.

- Every pin must be the version `proposed` serves, or it exits 1 before writing to the bucket.
- A package `stable` already serves at an equal or newer version is skipped, so a patch for an older line never downgrades `stable`.
- The workflow builds `kolibri-archive-keyring` and adds it to `stable` unless `stable` serves an equal or newer version; the root copy tracks the version `stable` serves. A key rotation reaches clients only on approval.

When a pinned promotion fails because `proposed` moved on, dispatch `platform-apt-repo-publish.yml` with the release's `kolibri` and `kolibri-server` asset URLs as `deb-url`, then dispatch the promotion again. That publish replaced the newer prerelease in `proposed`; publish its asset URLs again to restore it.

To roll `stable` back, publish the older release's `.deb`s the same way, then dispatch the promotion with its pins and `allow-downgrade`.

## Enabling a suite

`kolibri-archive-keyring` enables `stable` in `/etc/apt/sources.list.d/kolibri.sources`:

```
Types: deb
URIs: https://apt.learningequality.org/
Suites: stable
Components: main
Signed-By: /usr/share/keyrings/kolibri-archive-keyring.asc
```

To test releases before approval, add `proposed` in its own file, `/etc/apt/sources.list.d/kolibri-proposed.sources` — `kolibri.sources` is the keyring package's conffile:

```
Types: deb
URIs: https://apt.learningequality.org/
Suites: proposed
Components: main
Signed-By: /usr/share/keyrings/kolibri-archive-keyring.asc
```

On a host without `kolibri-archive-keyring` — one migrated from a `github.io` source, or a Raspberry Pi image, which trusts `/etc/apt/keyrings/learningequality.asc` — set `Signed-By` to the path its existing Kolibri source names. Installing the keyring package there instead adds a second `stable` source with another `Signed-By`, which apt refuses.

## New-user install

`kolibri-archive-keyring` (`keyring/`) ships the apt source file (`/etc/apt/sources.list.d/kolibri.sources`) and the signing key (`/usr/share/keyrings/kolibri-archive-keyring.asc`). The promote workflow serves it at the repo root, so a fresh host can bootstrap before it has apt configured:

```sh
curl -fsSLO https://apt.learningequality.org/kolibri-archive-keyring.deb
sudo dpkg -i kolibri-archive-keyring.deb
sudo apt update && sudo apt install kolibri
```

## Self-migration of the installed base

`migrate-apt-source.sh` defines `migrate_kolibri_apt_source()`, which rewrites any existing `github.io` Kolibri source under `/etc/apt/sources.list.d/` to `apt.learningequality.org`. It is idempotent, and a no-op when no such source is present (e.g. a Launchpad-PPA install). The `postinst` of both `kolibri` and `kolibri-server` calls it on `configure`, so existing installs migrate on their next `apt upgrade` with no user action.

## Cutover of the old Pages sites — run once

> **Warning:** for the cutover release only — the first release carrying the `postinst` migration snippet. It is not part of the ongoing release process.

Stragglers still resolving the old URLs must receive the cutover `.deb` on their next upgrade, so they self-migrate. Each old repo's `deploy_pages.yml` adds the `.deb` from its `deb-url` input to a mirror of the old site and deploys via `actions/deploy-pages`. The `.deb` replaces the version of the same package the site served; e.g. installer-debian stops serving `kolibri 0.19.5-0ubuntu1`.

Dispatch each old repo's `deploy_pages.yml` once with `deb-url` set to its released cutover `.deb`:

- `learningequality/kolibri-server` ([#133](https://github.com/learningequality/kolibri-server/pull/133)): the `kolibri-server` `.deb`. Mirrors the live site.
- `learningequality/kolibri-installer-debian` ([#179](https://github.com/learningequality/kolibri-installer-debian/pull/179)): the `kolibri` `.deb`. Mirrors the `gh-pages` branch. github.io may stop serving the `gh-pages` build once the source flips, so in order, without a gap:
  1. An admin switches its Pages source to GitHub Actions.
  2. Dispatch.
  3. An LE Admins member approves the `github-pages` environment.

The deployed `stable` repo must keep the old site's signing key and `Release` `Label`: stragglers' keyrings trust only that key, and apt rejects a changed `Label`.

## Verification

Each script in `tests/` names the behaviour it covers in its header. CI runs them with `APT_REPO_TESTS_STRICT=1`, so a missing tool fails rather than skips; standalone on a dev box, each skips cleanly when its tooling is absent.

`e2e_cutover.sh` is the full containerized cutover: an old-source client is auto-rewritten and fetches its next update from the new host.

## Ops prerequisites (#13720)

- The uploader service account needs `storage.objects.delete` and `storage.objects.update` under `downloads/kolibri/apt` — `roles/storage.objectCreator`, which the release uploads run on, is not enough. A GCS overwrite is a delete plus a create, and every publish after the first rewrites `dists/`, `db/` and the root files. Reads come from the bucket's public `allUsers` grant.
- `DEBIAN_REPO_SIGNING_KEY` must hold the private half of `platforms/raspberry-pi/files/learningequality.asc`, the key `keyring/kolibri-archive-keyring.asc` ships and the old Pages repos sign with. The workflow takes the key id from that committed key and aborts if the secret does not hold it. Each old repo's `DEBIAN_REPO_SIGNING_KEY` must hold the same key: its `deploy_pages.yml` reads the secret from its own repo.
- Standing up the subdomain (DNS + Cloudflare in front of the bucket), landing each old repo's `deploy_pages.yml` and dispatching it for the cutover release, the readthedocs user-manual update, and archiving the old Pages repos after both dispatches.
