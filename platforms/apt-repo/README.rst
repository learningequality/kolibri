Kolibri self-hosted APT repository
==================================

Publishing infrastructure for the Kolibri Debian/Ubuntu APT repo served at
``https://apt.learningequality.org/`` — one unified, backend-independent repo
(suite ``stable``, component ``main``) that replaces the per-installer
``learningequality.github.io/kolibri-server/`` and
``…/kolibri-installer-debian/`` GitHub Pages repos.

Publishing model
----------------

The repo is a `reprepro <https://salsa.debian.org/debian/reprepro>`_ tree that
lives on the release GCS bucket under ``downloads/kolibri/apt``, alongside the
release downloads. Each release does a **read-modify-write** so prior packages
and versions persist (a ``kolibri``-only release leaves the existing
``kolibri-server`` package live):

1. ``gcloud storage rsync`` the full repo tree **down** from the bucket.
2. ``reprepro includedeb stable`` the new ``.deb``\(s), skipping any version
   already published — a published version is immutable, and reprepro rejects
   same-version bytes that differ.
3. Export the served ``pubkey.asc`` from the signing key.
4. Sync back **up** a prefix at a time, ``pool`` first so no index is published
   naming a file that is not there yet. ``--checksums-only`` because reprepro
   rewrites ``db/*.db`` in place without changing size or mtime, and
   ``Cache-Control`` per prefix: pool files never change once published, while a
   cached index served against a newer pool is a client-side hash mismatch.

``publish.sh`` implements this; its header documents the env contract.
``conf/distributions.in`` is the suite config template, with the ``SignWith``
key rendered in at runtime.

The reusable workflow ``.github/workflows/platform-apt-repo-publish.yml`` runs
this in CI, serialized by a static ``concurrency`` group so two releases can
never clobber the shared repo state mid-write.

The workflow never builds the ``.deb`` it publishes: ``release_kolibri.yml``
builds ``kolibri-server`` once and passes that artifact name down through
``platform-debian-server-release.yml``. It can also be dispatched by hand with
``deb-url`` — a URL to an already-released ``.deb`` — to test the workflow or to
populate the repo from an existing release.

New-user install
-----------------

The ``kolibri-archive-keyring`` package (``keyring/``) ships the apt source file
(``/etc/apt/sources.list.d/kolibri.sources``) and the signing key
(``/usr/share/keyrings/kolibri-archive-keyring.asc``), replacing the manual
``curl``/``echo`` recipe. The publish workflow serves it at the repo root so a
fresh host can bootstrap before it has apt configured::

    curl -fsSLO https://apt.learningequality.org/kolibri-archive-keyring.deb
    sudo dpkg -i kolibri-archive-keyring.deb
    sudo apt update && sudo apt install kolibri

Self-migration of the existing installed base
---------------------------------------------

``migrate-apt-source.sh`` defines ``migrate_kolibri_apt_source()``, the cutover
snippet that rewrites any existing ``github.io`` Kolibri source under
``/etc/apt/sources.list.d/`` to ``apt.learningequality.org``. It is idempotent
and a no-op when no such source is present (e.g. a Launchpad-PPA install).
``kolibri-server``'s ``postinst`` sources and calls it on ``configure``; the
``kolibri`` package reuses the same snippet in its own migration (out of scope
here). Because the source rides with an auto-upgrading package, existing
installs migrate on their next ``apt upgrade`` with no user action.

seed_old_pages.sh — RUN ONCE
----------------------------

.. warning::

   ``seed_old_pages.sh`` is a **one-shot** script for the **cutover release
   only** — run it exactly once, for the first release carrying the ``postinst``
   migration snippet. It is **not** part of the ongoing release process.

It pushes the cutover ``.deb`` into the old (soon-to-be-archived) Pages repo(s)
so stragglers still resolving the old URL receive it on their next upgrade and
self-migrate. It read-modify-writes each old repo's own committed ``conf/`` (so
prior packages persist) and re-signs ``Release`` with the key named by that
repo's own ``SignWith`` — the matching secret key must be imported into the gpg
keyring first (with its passphrase preset, as the publish workflow does)::

    ./seed_old_pages.sh --deb path/to/kolibri-server_<ver>_all.deb --repo kolibri-server
    ./seed_old_pages.sh --deb path/to/kolibri_<ver>_all.deb        --repo kolibri-installer-debian

Verification
------------

Each script in ``tests/`` covers one acceptance criterion and states which in
its header. They run in CI (``.github/workflows/platform-apt-repo-test.yml``,
with ``APT_REPO_TESTS_STRICT=1`` so a missing tool fails rather than skips) and
standalone on a dev box, where each skips cleanly when its tooling is absent.

``e2e_cutover.sh`` is the full containerized cutover: an old-source client is
auto-rewritten and fetches its next update from the new host. To reproduce the
real Debian 13 check, run it against the live ``apt.learningequality.org`` once
ops has provisioned the host.

Ops prerequisites — out of scope here (tracked on #13720)
---------------------------------------------------------

Standing up the subdomain (DNS + Cloudflare in front of the GCS bucket), the
CI secrets, actually running ``seed_old_pages.sh`` for the cutover release, the
readthedocs user-manual update, and archiving the old Pages repos are **admin/ops
tasks tracked on #13720**, not code in this directory.

**Key-match assumption:** the private half of ``GPG_SIGNING_KEY`` must match the
committed client trust key ``platforms/raspberry-pi/files/learningequality.asc``
(the byte-identical source of ``keyring/kolibri-archive-keyring.asc``). If the
self-hosted repo historically used a different key than the PPA, ops must
reconcile them before the cutover (reprepro fails loudly at publish rather than
shipping a silently-broken repo).
