# Kolibri self-hosted APT repository

Publishing infrastructure for `https://apt.learningequality.org/` (suite `stable`, component `main`), replacing the `learningequality.github.io/kolibri-server/` and `…/kolibri-installer-debian/` Pages repos.

## Publishing model

A [reprepro](https://salsa.debian.org/debian/reprepro) tree on the release GCS bucket under `downloads/kolibri/apt`. Each release read-modify-writes it, so prior packages and versions persist:

1. `gcloud storage rsync` the tree **down**.
2. `reprepro includedeb stable` the new `.deb`(s), skipping any version already published — reprepro rejects same-version bytes that differ.
3. Export `pubkey.asc` from the signing key.
4. Sync **up** one prefix at a time:
   - `pool` first, so no index is published naming a file that is not there yet.
   - `--checksums-only`, because reprepro rewrites `db/*.db` in place without changing size or mtime.
   - `Cache-Control` per prefix: pool objects never change once published, while a cached index served against a newer pool is a client-side hash mismatch.

`publish.sh` implements this; its header documents the env contract. `conf/distributions.in` is the suite template, with `SignWith` rendered in at runtime.

`.github/workflows/platform-apt-repo-publish.yml` runs it in CI, serialized by a static `concurrency` group so two releases cannot clobber the shared state mid-write.

The workflow never builds the `.deb` it publishes: `release_kolibri.yml` builds `kolibri` and `kolibri-server` and passes each artifact name down. Dispatch it by hand with `deb-url` to publish an already-released `.deb`.

## New-user install

`kolibri-archive-keyring` (`keyring/`) ships the apt source file (`/etc/apt/sources.list.d/kolibri.sources`) and the signing key (`/usr/share/keyrings/kolibri-archive-keyring.asc`). The workflow serves it at the repo root, so a fresh host can bootstrap before it has apt configured:

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

Each script in `tests/` covers one acceptance criterion and names it in its header. CI runs them with `APT_REPO_TESTS_STRICT=1`, so a missing tool fails rather than skips; standalone on a dev box, each skips cleanly when its tooling is absent.

`e2e_cutover.sh` is the full containerized cutover: an old-source client is auto-rewritten and fetches its next update from the new host.

## Ops prerequisites (#13720)

- The uploader service account needs `storage.objects.delete` and `storage.objects.update` under `downloads/kolibri/apt` — `roles/storage.objectCreator`, which the release uploads run on, is not enough. A GCS overwrite is a delete plus a create, and every publish after the first rewrites `dists/`, `db/` and the root files. Reads come from the bucket's public `allUsers` grant.
- `DEBIAN_REPO_SIGNING_KEY` must hold the private half of `platforms/raspberry-pi/files/learningequality.asc`, the key `keyring/kolibri-archive-keyring.asc` ships and the old Pages repos sign with. The workflow takes the key id from that committed key and aborts if the secret does not hold it. Each old repo's `DEBIAN_REPO_SIGNING_KEY` must hold the same key: its `deploy_pages.yml` reads the secret from its own repo.
- Standing up the subdomain (DNS + Cloudflare in front of the bucket), landing each old repo's `deploy_pages.yml` and dispatching it for the cutover release, the readthedocs user-manual update, and archiving the old Pages repos after both dispatches.
