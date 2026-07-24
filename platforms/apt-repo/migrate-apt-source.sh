#!/bin/sh
# Cutover snippet: rewrite any existing self-hosted Kolibri APT source that
# still names a github.io host to the canonical apt.learningequality.org.
#
# The old repos were served per-installer, but the new host serves ONE unified
# repo at its root, so host and trailing path collapse together.
#
# Sourced by the kolibri-server postinst (which runs `set -e`) and reused by the
# debian kolibri package's own migration. Idempotent; a no-op when no github.io
# Kolibri source is present (e.g. a Launchpad-PPA install).
migrate_kolibri_apt_source() {
	dir="${KOLIBRI_APT_SOURCES_DIR:-/etc/apt/sources.list.d}"
	[ -d "$dir" ] || return 0
	old_hosts='learningequality\.github\.io/(kolibri-server|kolibri-installer-debian)'
	# The pipe-to-`while` form keeps the pipeline's exit status the `while`
	# (success even when grep finds nothing), so a no-match install does not
	# abort the sourcing postinst under `set -e`.
	grep -rlE "$old_hosts" "$dir" 2>/dev/null \
		| while read -r f; do
			sed -i -E "s#$old_hosts#apt.learningequality.org#g" "$f"
		done
	return 0
}

# Run only when executed directly, not when sourced by the postinst.
case "$0" in
	*/migrate-apt-source.sh) migrate_kolibri_apt_source ;;
esac
