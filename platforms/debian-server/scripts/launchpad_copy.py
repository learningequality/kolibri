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

log = logging.getLogger(APP_NAME)

STARTUP_TIME = LAST_LOG_TIME = time.time()
REQUESTS = LAST_REQUESTS = 0


# --- Utilities ---


def get_current_series():
    """Get the Ubuntu series codename for the current system."""
    return subprocess.check_output(["lsb_release", "-cs"], text=True).strip()


def get_supported_series(distribution, source_series):
    """Discover supported Ubuntu series from Launchpad, excluding source_series."""
    supported_statuses = ("Supported", "Current Stable Release")
    series = [
        s.name for s in distribution.series if s.active and s.status in supported_statuses and s.name != source_series
    ]
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

    def get_published_sources(self, ppa, series_name=None, status=None):
        kwargs = {}
        if series_name:
            kwargs["distro_series"] = self.get_series(series_name)
        if status:
            kwargs["status"] = status
        kwargs["order_by_date"] = True
        log.debug("Listing source packages...")
        return ppa.getPublishedSources(**kwargs)

    def get_builds_for_source(self, source):
        log.debug(
            "Listing %s builds for %s %s...",
            source.distro_series_link.rpartition("/")[-1],
            source.source_package_name,
            source.source_package_version,
        )
        return source.getBuilds()

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
        return bool(builds) and builds[0].buildstate == "Successfully built"

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

    def queue_copy(self, name, version, source_series, target_series, pocket):
        self.queue[source_series, target_series, pocket].add((name, version))

    def perform_queued_copies(self, ppa):
        first = True
        failures = []
        for (source_series, target_series, pocket), packages in self.queue.items():
            if not packages:
                continue
            if first:
                log.info("")
                first = False
            names = sorted(name for name, version in packages)
            log.info("Copying %s to %s", ", ".join(names), target_series)
            try:
                ppa.syncSources(
                    from_archive=ppa,
                    to_series=target_series,
                    to_pocket=pocket,
                    include_binaries=True,
                    source_names=names,
                )
            except lre.BadRequest as e:
                msg = str(e)
                if "same version already published" in msg:
                    log.info("Already copied to %s — skipping", target_series)
                else:
                    log.error("Failed to copy to %s: %s", target_series, msg)
                    failures.append(target_series)
        if failures:
            log.error("Copy failed for series: %s", ", ".join(failures))
            return 1
        return 0

    def copy_to_series(self, source_series=None):
        """Copy packages from source series to all other supported Ubuntu series."""
        source_series = source_series or get_current_series()
        log.info(
            "Spinning up the Launchpad API to copy targets in %s (source series: %s)",
            ", ".join(PACKAGE_WHITELIST),
            source_series,
        )

        ppa = self.proposed_ppa

        for name, version in self.get_usable_sources(ppa, tuple(PACKAGE_WHITELIST), source_series):
            mentioned = False
            notices = []
            target_series_names = get_supported_series(ppa.distribution, source_series)
            for target_series_name in target_series_names:
                source = self.get_source_for(ppa, name, version, target_series_name)
                if source is None:
                    mentioned = True
                    log.info("%s %s missing from %s", name, version, target_series_name)
                    if self.has_published_binaries(ppa, name, version, source_series):
                        self.queue_copy(name, version, source_series, target_series_name, POCKET)
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

        result = self.perform_queued_copies(ppa)
        log.debug("All done")
        return result

    def check_source(self, package, version, ppa_name=None):
        """Check if a source package version exists in a PPA.
        Returns 0 if found (already uploaded), 1 if missing.
        """
        ppa_name = ppa_name or PROPOSED_PPA_NAME
        ppa = self.get_ppa(ppa_name)
        published = ppa.getPublishedSources(
            source_name=package,
            version=version,
            order_by_date=True,
        )
        active = [s for s in published if s.status not in ("Deleted", "Superseded", "Obsolete")]
        if active:
            log.info("%s %s already exists in %s (status: %s)", package, version, ppa_name, active[0].status)
            return 0
        log.info("%s %s not found in %s", package, version, ppa_name)
        return 1

    def wait_for_published(self, package, version, ppa_name=None, series=None, timeout=1800, interval=60):
        """Wait for published binaries to appear for a package.

        If series is given, waits for those specific series to have published binaries.
        If series is None, discovers all series that have a published source for this
        package+version and waits until every one of them also has published binaries.
        Returns 0 if all expected series are published, 1 on failure or timeout.
        """
        ppa_name = ppa_name or PROPOSED_PPA_NAME
        ppa = self.get_ppa(ppa_name)
        deadline = time.time() + timeout
        expected = set(series) if series else None

        log.info(
            "Waiting for %s %s to be published in %s%s...",
            package,
            version,
            ppa_name,
            " for series: %s" % ", ".join(sorted(expected)) if expected else "",
        )

        while time.time() < deadline:
            # If no explicit series, discover from published sources
            if expected is None:
                sources = ppa.getPublishedSources(
                    source_name=package,
                    version=version,
                    order_by_date=True,
                )
                source_series = set()
                for s in sources:
                    if s.status not in ("Deleted", "Superseded", "Obsolete"):
                        series_name = s.distro_series_link.rstrip("/").split("/")[-1]
                        source_series.add(series_name)
                if not source_series:
                    log.info("No published sources yet.")
                    remaining = int(deadline - time.time())
                    log.info("Retrying in %ds (%ds remaining)...", interval, remaining)
                    time.sleep(interval)
                    continue
                expected = source_series
                log.info("Discovered %d series with sources: %s", len(expected), ", ".join(sorted(expected)))

            # Check published binaries
            bins = ppa.getPublishedBinaries(
                binary_name=package,
                version=version,
                order_by_date=True,
            )
            published_series = set()
            for b in bins:
                if b.status == "Published":
                    # distro_arch_series_link: .../ubuntu/noble/amd64
                    series_name = b.distro_arch_series_link.rstrip("/").split("/")[-2]
                    published_series.add(series_name)

            missing = expected - published_series
            if not missing:
                log.info("All %d series published: %s", len(expected), ", ".join(sorted(published_series)))
                return 0
            log.info(
                "Published in %d/%d series. Missing: %s",
                len(expected) - len(missing),
                len(expected),
                ", ".join(sorted(missing)),
            )

            remaining = int(deadline - time.time())
            log.info("Retrying in %ds (%ds remaining)...", interval, remaining)
            time.sleep(interval)

        log.error("Timeout: %s %s not published within %ds", package, version, timeout)
        return 1

    def promote(self, version):
        """Promote published packages from kolibri-proposed to kolibri PPA."""
        log.info("Promoting packages from %s to %s", PROPOSED_PPA_NAME, RELEASE_PPA_NAME)

        source_ppa = self.proposed_ppa
        dest_ppa = self.release_ppa

        packages = source_ppa.getPublishedSources(status="Published", order_by_date=True)

        # Group packages by series for syncSources calls
        by_series = defaultdict(list)
        for pkg in packages:
            if pkg.source_package_name not in PACKAGE_WHITELIST:
                continue
            if pkg.source_package_version != version:
                continue
            series_name = pkg.distro_series_link.rstrip("/").split("/")[-1]
            by_series[series_name].append(pkg)

        if not by_series:
            log.info("No eligible packages to promote.")
            return 0

        failures = []
        for series_name, pkgs in by_series.items():
            names = sorted(set(p.source_package_name for p in pkgs))
            log.info("Promoting %s from %s to %s", ", ".join(names), series_name, RELEASE_PPA_NAME)
            try:
                dest_ppa.syncSources(
                    from_archive=source_ppa,
                    to_series=series_name,
                    to_pocket=POCKET,
                    include_binaries=True,
                    source_names=names,
                )
            except lre.BadRequest as e:
                msg = str(e)
                if "same version already published" in msg:
                    log.info("Already published in %s — skipping", series_name)
                elif "is obsolete and will not accept new uploads" in msg:
                    log.info("Skip obsolete series %s", series_name)
                else:
                    log.error("Failed to promote to %s: %s", series_name, msg)
                    failures.append(series_name)

        if failures:
            log.error("Promotion failed for series: %s", ", ".join(failures))
            return 1

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
    subparsers = parser.add_subparsers(dest="command", required=True)

    copy_parser = subparsers.add_parser(
        "copy-to-series",
        help="Copy packages from source series to all other supported series within a PPA.",
    )
    copy_parser.add_argument("--series", default=None, help="Source series override (default: auto-detect from OS).")

    promote_parser = subparsers.add_parser(
        "promote",
        help="Promote published packages from kolibri-proposed to kolibri PPA.",
    )
    promote_parser.add_argument("--version", required=True, help="Version to promote.")

    wait_parser = subparsers.add_parser(
        "wait-for-published",
        help="Wait for published binaries to appear for a source package.",
    )
    wait_parser.add_argument("--package", required=True, help="Source package name.")
    wait_parser.add_argument("--version", required=True, help="Expected version string.")
    wait_parser.add_argument("--ppa", default=PROPOSED_PPA_NAME, help="PPA name to poll (default: %(default)s).")
    wait_parser.add_argument("--timeout", type=int, default=1800, help="Max wait in seconds (default: %(default)s).")
    wait_parser.add_argument(
        "--interval", type=int, default=60, help="Polling interval in seconds (default: %(default)s)."
    )
    wait_parser.add_argument("--series", nargs="+", default=None, help="Series to wait for (default: any).")

    check_parser = subparsers.add_parser(
        "check-source",
        help="Check if a source package version already exists in a PPA.",
    )
    check_parser.add_argument("--package", required=True, help="Source package name.")
    check_parser.add_argument("--version", required=True, help="Expected version string.")
    check_parser.add_argument("--ppa", default=PROPOSED_PPA_NAME, help="PPA name to check (default: %(default)s).")

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
    return lp.copy_to_series(source_series=args.series)


def cmd_wait_for_published(args):
    """Wait for published binaries to appear."""
    lp = LaunchpadWrapper()
    return lp.wait_for_published(
        package=args.package,
        version=args.version,
        ppa_name=args.ppa,
        series=args.series,
        timeout=args.timeout,
        interval=args.interval,
    )


def cmd_check_source(args):
    """Check if a source package version already exists in a PPA."""
    lp = LaunchpadWrapper()
    return lp.check_source(
        package=args.package,
        version=args.version,
        ppa_name=args.ppa,
    )


def cmd_promote(args):
    """Promote published packages from kolibri-proposed to kolibri PPA."""
    lp = LaunchpadWrapper()
    return lp.promote(version=args.version)


def main():
    parser = build_parser()
    args = parser.parse_args()
    configure_logging(args)

    if args.command == "copy-to-series":
        return cmd_copy_to_series(args)
    elif args.command == "check-source":
        return cmd_check_source(args)
    elif args.command == "promote":
        return cmd_promote(args)
    elif args.command == "wait-for-published":
        return cmd_wait_for_published(args)


if __name__ == "__main__":
    raise SystemExit(main())
