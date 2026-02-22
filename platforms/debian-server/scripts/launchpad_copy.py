#!/usr/bin/env python3
"""Consolidated Launchpad PPA copy tool.

Subcommands:
  copy-to-series  Copy packages from source series to all other supported series within a PPA.
  promote         Copy all published packages from one PPA to another.
"""

import argparse
import functools
import logging
import subprocess
import sys
import time
from collections import defaultdict

import httplib2
import lazr.restfulclient.errors as lre
from launchpadlib.launchpad import Launchpad

# --- Constants ---

PPA_OWNER = "learningequality"
PROPOSED_PPA_NAME = "kolibri-proposed"
RELEASE_PPA_NAME = "kolibri"
PACKAGE_WHITELIST = ["kolibri-server"]
POCKET = "Release"
APP_NAME = "ppa-kolibri-server-copy-packages"

TERMINAL_BUILD_STATES = frozenset(
    {
        "Successfully built",
        "Failed to build",
        "Chroot problem",
        "Failed to upload",
        "Cancelled build",
    }
)

FAILED_BUILD_STATES = frozenset(
    {
        "Failed to build",
        "Chroot problem",
        "Failed to upload",
        "Cancelled build",
    }
)

log = logging.getLogger(APP_NAME)

STARTUP_TIME = LAST_LOG_TIME = time.time()
REQUESTS = LAST_REQUESTS = 0


# --- Utilities ---


def get_current_series():
    """Get the Ubuntu series codename for the current system."""
    return subprocess.check_output(["lsb_release", "-cs"], text=True).strip()


def get_supported_series(source_series):
    """Discover supported Ubuntu series dynamically, including ESM/ELTS."""
    out = subprocess.check_output(["ubuntu-distro-info", "--supported-esm"], text=True).strip()
    all_series = out.split()
    series = [s for s in all_series if s and s != source_series]
    log.info("Dynamic series discovery:")
    log.info("  Target series (will copy to): %s", ", ".join(series))
    return series


class DebugFormatter(logging.Formatter):
    def format(self, record):
        global LAST_LOG_TIME, LAST_REQUESTS
        msg = super().format(record)
        if msg.startswith("  "):
            return msg
        now = time.time()
        elapsed = now - STARTUP_TIME
        delta = now - LAST_LOG_TIME
        LAST_LOG_TIME = now
        delta_requests = REQUESTS - LAST_REQUESTS
        LAST_REQUESTS = REQUESTS
        return "\n%.3fs (%+.3fs) [%d/+%d] %s" % (
            elapsed,
            delta,
            REQUESTS,
            delta_requests,
            msg,
        )


def enable_http_debugging():
    httplib2.debuglevel = 1


def install_request_counter():
    orig = httplib2.Http.request

    @functools.wraps(orig)
    def wrapper(*args, **kw):
        global REQUESTS
        REQUESTS += 1
        return orig(*args, **kw)

    httplib2.Http.request = wrapper


def set_up_logging(level=logging.INFO):
    handler = logging.StreamHandler(sys.stdout)
    if level == logging.DEBUG:
        handler.setFormatter(DebugFormatter())
    log.addHandler(handler)
    log.setLevel(level)


# --- LaunchpadWrapper ---


class LaunchpadWrapper:
    """Cached wrapper around the Launchpad API."""

    def __init__(self):
        self.queue = defaultdict(set)
        self.dry_run = False

    @functools.cached_property
    def lp(self):
        log.debug("Logging in...")
        return Launchpad.login_with(
            application_name=APP_NAME,
            service_root="production",
        )

    @functools.cached_property
    def owner(self):
        lp = self.lp
        log.debug("Getting the owner...")
        return lp.people[PPA_OWNER]

    def get_ppa(self, name):
        owner = self.owner
        log.debug("Getting PPA: %s...", name)
        return owner.getPPAByName(name=name)

    @functools.cached_property
    def proposed_ppa(self):
        return self.get_ppa(PROPOSED_PPA_NAME)

    @functools.cached_property
    def release_ppa(self):
        return self.get_ppa(RELEASE_PPA_NAME)

    @functools.cache
    def get_series(self, name):
        ppa = self.proposed_ppa
        log.debug("Locating the series: %s...", name)
        return ppa.distribution.getSeries(name_or_version=name)

    @functools.cache
    def get_published_sources(self, ppa, series_name=None, status=None):
        kwargs = {}
        if series_name:
            kwargs["distro_series"] = self.get_series(series_name)
        if status:
            kwargs["status"] = status
        kwargs["order_by_date"] = True
        log.debug("Listing source packages...")
        return ppa.getPublishedSources(**kwargs)

    @functools.cache
    def get_builds_for_source(self, source):
        log.debug(
            "Listing %s builds for %s %s...",
            source.distro_series_link.rpartition("/")[-1],
            source.source_package_name,
            source.source_package_version,
        )
        return source.getBuilds()

    @functools.cache
    def get_source_packages(self, ppa, series_name, package_names=None):
        """Return {package_name: {version: source, ...}, ...}"""
        res = defaultdict(dict)
        for source in self.get_published_sources(ppa, series_name):
            name = source.source_package_name
            if package_names is not None and name not in package_names:
                continue
            res[name][source.source_package_version] = source
        return res

    def get_source_for(self, ppa, name, version, series_name):
        sources = self.get_source_packages(ppa, series_name)
        return sources.get(name, {}).get(version)

    def is_missing(self, ppa, name, version, series_name):
        return self.get_source_for(ppa, name, version, series_name) is None

    def get_builds_for(self, ppa, name, version, series_name):
        source = self.get_source_for(ppa, name, version, series_name)
        if not source:
            return None
        return self.get_builds_for_source(source)

    def has_published_binaries(self, ppa, name, version, series_name):
        builds = self.get_builds_for(ppa, name, version, series_name)
        return not builds or builds[0].buildstate == "Successfully built"

    @functools.cache
    def get_usable_sources(self, ppa, package_names, series_name):
        res = []
        for source in self.get_published_sources(ppa, series_name):
            name = source.source_package_name
            if name not in package_names:
                continue
            version = source.source_package_version
            if source.status in ("Superseded", "Deleted", "Obsolete"):
                log.info(
                    "%s %s is %s in %s",
                    name,
                    version,
                    source.status.lower(),
                    series_name,
                )
                continue
            if source.status != "Published":
                log.warning(
                    "%s %s is %s in %s",
                    name,
                    version,
                    source.status.lower(),
                    series_name,
                )
                continue
            res.append((name, version))
        return res

    def queue_copy(self, name, source_series, target_series, pocket):
        self.queue[source_series, target_series, pocket].add(name)

    def perform_queued_copies(self, ppa):
        first = True
        for (source_series, target_series, pocket), names in self.queue.items():
            if not names:
                continue
            if first:
                log.info("")
                first = False
            if self.dry_run:
                log.info("DRY-RUN: would copy %s from %s to %s", ", ".join(sorted(names)), source_series, target_series)
            else:
                log.info("Copying %s to %s", ", ".join(sorted(names)), target_series)
                ppa.syncSources(
                    from_archive=ppa,
                    to_series=target_series,
                    to_pocket=pocket,
                    include_binaries=True,
                    source_names=sorted(names),
                )

    def copy_to_series(self):
        """Copy packages from source series to all other supported Ubuntu series."""
        source_series = get_current_series()
        log.info(
            "Spinning up the Launchpad API to copy targets in %s (source series: %s)",
            ", ".join(PACKAGE_WHITELIST),
            source_series,
        )

        ppa = self.proposed_ppa

        for name, version in self.get_usable_sources(ppa, tuple(PACKAGE_WHITELIST), source_series):
            mentioned = False
            notices = []
            target_series_names = get_supported_series(source_series)
            for target_series_name in target_series_names:
                source = self.get_source_for(ppa, name, version, target_series_name)
                if source is None:
                    mentioned = True
                    log.info("%s %s missing from %s", name, version, target_series_name)
                    if self.has_published_binaries(ppa, name, version, source_series):
                        self.queue_copy(name, source_series, target_series_name, POCKET)
                    else:
                        builds = self.get_builds_for(ppa, name, version, source_series)
                        if builds:
                            log.info(
                                "  but it isn't built yet (state: %s) - %s",
                                builds[0].buildstate,
                                builds[0].web_link,
                            )
                elif source.status != "Published":
                    notices.append("  but it is %s in %s" % (source.status.lower(), target_series_name))
                elif not self.has_published_binaries(ppa, name, version, target_series_name):
                    builds = self.get_builds_for(ppa, name, version, target_series_name)
                    if builds:
                        notices.append(
                            "  but it isn't built yet for %s (state: %s) - %s"
                            % (
                                target_series_name,
                                builds[0].buildstate,
                                builds[0].web_link,
                            )
                        )
            if not mentioned or notices:
                log.info("%s %s", name, version)
                for notice in notices:
                    log.info(notice)

        self.perform_queued_copies(ppa)
        log.debug("All done")
        return 0

    def wait_for_builds(self, package, version, ppa_name=None, timeout=1800, interval=60):
        """Wait for all builds of a source package to reach a terminal state.

        Returns 0 if all builds succeed, 1 on failure or timeout.
        """
        ppa_name = ppa_name or PROPOSED_PPA_NAME
        ppa = self.get_ppa(ppa_name)
        deadline = time.time() + timeout

        # Phase 1: Wait for source to appear
        log.info("Waiting for %s %s to appear in %s...", package, version, ppa_name)
        sources = []
        while time.time() < deadline:
            published = ppa.getPublishedSources(
                source_name=package,
                version=version,
                order_by_date=True,
            )
            sources = [s for s in published if s.status not in ("Deleted", "Superseded", "Obsolete")]
            if sources:
                log.info("Found %d source(s) for %s %s", len(sources), package, version)
                break
            remaining = int(deadline - time.time())
            log.info("Source not yet available. Retrying in %ds (%ds remaining)...", interval, remaining)
            time.sleep(interval)
        else:
            log.error("Timeout: %s %s did not appear in %s within %ds", package, version, ppa_name, timeout)
            return 1

        # Phase 2: Wait for all builds to complete
        return self._poll_builds(sources, package, version, deadline, interval)

    def _poll_builds(self, sources, package, version, deadline, interval):
        """Poll builds for all sources until terminal state or timeout."""
        log.info("Waiting for builds to complete...")
        while time.time() < deadline:
            all_terminal = True
            total = 0
            succeeded = 0
            failed = []
            building = 0

            for source in sources:
                builds = source.getBuilds()
                for build in builds:
                    total += 1
                    state = build.buildstate
                    if state == "Successfully built":
                        succeeded += 1
                    elif state in FAILED_BUILD_STATES:
                        failed.append((build.arch_tag, state, build.web_link))
                    else:
                        building += 1
                        all_terminal = False

            if failed:
                log.error("Build failures detected:")
                for arch, state, link in failed:
                    log.error("  %s: %s - %s", arch, state, link)
                return 1

            if total > 0 and all_terminal:
                log.info("All %d build(s) completed successfully.", total)
                return 0

            log.info("Waiting for builds: %d/%d complete, %d building...", succeeded, total, building)
            remaining = int(deadline - time.time())
            log.info("Retrying in %ds (%ds remaining)...", interval, remaining)
            time.sleep(interval)

        log.error("Timeout: builds for %s %s did not complete within timeout", package, version)
        return 1

    def promote(self):
        """Promote published packages from kolibri-proposed to kolibri PPA."""
        log.info("Promoting packages from %s to %s", PROPOSED_PPA_NAME, RELEASE_PPA_NAME)

        source_ppa = self.proposed_ppa
        dest_ppa = self.release_ppa

        packages = source_ppa.getPublishedSources(status="Published", order_by_date=True)

        copied_any = False
        for pkg in packages:
            if pkg.source_package_name not in PACKAGE_WHITELIST:
                continue
            try:
                if self.dry_run:
                    log.info(
                        "DRY-RUN: would copy %s %s (%s) to %s",
                        pkg.source_package_name,
                        pkg.source_package_version,
                        pkg.distro_series_link,
                        RELEASE_PPA_NAME,
                    )
                else:
                    log.info(
                        "Copying %s %s (%s) to %s",
                        pkg.source_package_name,
                        pkg.source_package_version,
                        pkg.distro_series_link,
                        RELEASE_PPA_NAME,
                    )
                    dest_ppa.copyPackage(
                        from_archive=source_ppa,
                        include_binaries=True,
                        to_pocket=pkg.pocket,
                        source_name=pkg.source_package_name,
                        version=pkg.source_package_version,
                    )
                copied_any = True
            except lre.BadRequest as e:
                if "is obsolete and will not accept new uploads" in str(e):
                    log.info(
                        "Skip obsolete series for %s %s",
                        pkg.source_package_name,
                        pkg.source_package_version,
                    )
                else:
                    raise

        if not copied_any:
            log.info("No eligible packages to promote.")
        else:
            log.info("Promotion requests submitted.")

        return 0


# --- CLI ---


def build_parser():
    parser = argparse.ArgumentParser(description="Launchpad PPA copy tool for kolibri-server packages.")
    parser.add_argument(
        "-v",
        "--verbose",
        action="count",
        default=0,
        help="Increase verbosity (use -vv for debug).",
    )
    parser.add_argument("-q", "--quiet", action="store_true", help="Suppress info output.")
    parser.add_argument("--debug", action="store_true", help="Enable HTTP debug output.")
    parser.add_argument("--dry-run", action="store_true", default=False, help="Log actions without making changes.")

    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser(
        "copy-to-series",
        help="Copy packages from source series to all other supported series within a PPA.",
    )

    subparsers.add_parser(
        "promote",
        help="Promote published packages from kolibri-proposed to kolibri PPA.",
    )

    wait_parser = subparsers.add_parser(
        "wait-for-builds",
        help="Wait for Launchpad builds to complete for a source package.",
    )
    wait_parser.add_argument("--package", required=True, help="Source package name.")
    wait_parser.add_argument("--version", required=True, help="Expected version string.")
    wait_parser.add_argument("--ppa", default=PROPOSED_PPA_NAME, help="PPA name to poll (default: %(default)s).")
    wait_parser.add_argument("--timeout", type=int, default=1800, help="Max wait in seconds (default: %(default)s).")
    wait_parser.add_argument(
        "--interval", type=int, default=60, help="Polling interval in seconds (default: %(default)s)."
    )

    return parser


def configure_logging(args):
    if args.quiet:
        set_up_logging(logging.WARNING)
    elif args.debug:
        enable_http_debugging()
        install_request_counter()
        set_up_logging(logging.DEBUG)
    elif args.verbose > 1:
        install_request_counter()
        set_up_logging(logging.DEBUG)
    else:
        set_up_logging(logging.INFO)


def cmd_copy_to_series(args):
    """Copy packages from source series to all other supported Ubuntu series."""
    lp = LaunchpadWrapper()
    lp.dry_run = args.dry_run
    return lp.copy_to_series()


def cmd_wait_for_builds(args):
    """Wait for Launchpad builds to complete."""
    lp = LaunchpadWrapper()
    lp.dry_run = args.dry_run
    return lp.wait_for_builds(
        package=args.package,
        version=args.version,
        ppa_name=args.ppa,
        timeout=args.timeout,
        interval=args.interval,
    )


def cmd_promote(args):
    """Promote published packages from kolibri-proposed to kolibri PPA."""
    lp = LaunchpadWrapper()
    lp.dry_run = args.dry_run
    return lp.promote()


def main():
    parser = build_parser()
    args = parser.parse_args()
    configure_logging(args)

    if args.command == "copy-to-series":
        return cmd_copy_to_series(args)
    elif args.command == "promote":
        return cmd_promote(args)
    elif args.command == "wait-for-builds":
        return cmd_wait_for_builds(args)


if __name__ == "__main__":
    raise SystemExit(main())
