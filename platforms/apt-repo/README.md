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

The workflow never builds the `.deb` it publishes: `release_kolibri.yml` builds `kolibri-server` and passes the artifact name down through `platform-debian-server-release.yml`. Dispatch it by hand with `deb-url` to publish an already-released `.deb`.

## New-user install

`kolibri-archive-keyring` (`keyring/`) ships the apt source file (`/etc/apt/sources.list.d/kolibri.sources`) and the signing key (`/usr/share/keyrings/kolibri-archive-keyring.asc`). The workflow serves it at the repo root, so a fresh host can bootstrap before it has apt configured:

```sh
curl -fsSLO https://apt.learningequality.org/kolibri-archive-keyring.deb
sudo dpkg -i kolibri-archive-keyring.deb
sudo apt update && sudo apt install kolibri
```

## Self-migration of the installed base

`migrate-apt-source.sh` defines `migrate_kolibri_apt_source()`, which rewrites any existing `github.io` Kolibri source under `/etc/apt/sources.list.d/` to `apt.learningequality.org`. It is idempotent, and a no-op when no such source is present (e.g. a Launchpad-PPA install). `kolibri-server`'s `postinst` calls it on `configure`, so existing installs migrate on their next `apt upgrade` with no user action.

## seed_old_pages.sh — run once

> **Warning:** a one-shot script for the cutover release only — the first release carrying the `postinst` migration snippet. It is not part of the ongoing release process.

It pushes the cutover `.deb` into the old, soon-to-be-archived Pages repo(s), so stragglers still resolving the old URL receive it on their next upgrade and self-migrate. Each old repo is read-modify-written against its own committed `conf/`, and its `Release` re-signed with the key that repo's `SignWith` names, which must already be in the gpg keyring.

```sh
./seed_old_pages.sh --deb path/to/kolibri-server_<ver>_all.deb --repo kolibri-server
./seed_old_pages.sh --deb path/to/kolibri_<ver>_all.deb        --repo kolibri-installer-debian
```

## Verification

Each script in `tests/` covers one acceptance criterion and names it in its header. CI runs them with `APT_REPO_TESTS_STRICT=1`, so a missing tool fails rather than skips; standalone on a dev box, each skips cleanly when its tooling is absent.

`e2e_cutover.sh` is the full containerized cutover: an old-source client is auto-rewritten and fetches its next update from the new host.

## Ops prerequisites (#13720)

- The uploader service account needs `storage.objects.delete` and `storage.objects.update` under `downloads/kolibri/apt` — `roles/storage.objectCreator`, which the release uploads run on, is not enough. A GCS overwrite is a delete plus a create, and every publish after the first rewrites `dists/`, `db/` and the root files. Reads come from the bucket's public `allUsers` grant.
- `DEBIAN_REPO_SIGNING_KEY` must hold the private half of `platforms/raspberry-pi/files/learningequality.asc`, the key `keyring/kolibri-archive-keyring.asc` ships and the old Pages repos sign with. The workflow takes the key id from that committed key and aborts if the secret does not hold it.
- Standing up the subdomain (DNS + Cloudflare in front of the bucket), running `seed_old_pages.sh` for the cutover release, the readthedocs user-manual update, and archiving the old Pages repos.
