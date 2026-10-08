#!/usr/bin/env python3
"""Consolidated Launchpad PPA copy tool.

Subcommands:
  copy-to-series  Copy packages from source series to all other supported series within a PPA.
  promote         Copy all published packages from one PPA to another.
  check-source    Check if a source package version already exists in a PPA.
  wait-for-published  Wait for published binaries to appear for a source package.
"""

import argparse
import datetime
import functools
import http.client
import logging
import os
import sys
import time
from collections import defaultdict

try:
    import httplib2
except ImportError:
    httplib2 = None

try:
    from launchpadlib.launchpad import Launchpad
except ImportError:
    Launchpad = None

try:
    from distro_info import UbuntuDistroInfo
except ImportError:
    UbuntuDistroInfo = None

# --- Constants ---

PPA_OWNER = "learningequality"
PROPOSED_PPA_NAME = "kolibri-proposed"
RELEASE_PPA_NAME = "kolibri"
POCKET = "Release"
APP_NAME = "ppa-kolibri-source-copy-packages"

# Transient network failures that should be retried rather than aborting a
# long-running poll. ssl.SSLEOFError (a subclass of OSError) is the one seen in
# CI: across a long polling interval Launchpad drops the idle keep-alive socket,
# and reusing the stale connection raises "EOF occurred in violation of protocol".
TRANSIENT_ERRORS = (OSError, http.client.HTTPException)
if httplib2 is not None:
    TRANSIENT_ERRORS += (httplib2.HttpLib2Error,)

# Per-call retry budget for transient errors: a quick reconnect-and-retry so a
# single blip doesn't fail the release. Backoff is BACKOFF * attempt seconds.
TRANSIENT_RETRY_ATTEMPTS = 4
TRANSIENT_RETRY_BACKOFF = 15

log = logging.getLogger(APP_NAME)

STARTUP_TIME = LAST_LOG_TIME = time.time()
REQUESTS = LAST_REQUESTS = 0


# --- Utilities ---


def get_current_series():
    """Ubuntu series we publish the source to: the current LTS.

    This must match the changelog distribution chosen by
    generate_changelog.get_current_lts_codename() (UbuntuDistroInfo().lts()),
    NOT the runner's own OS series. The two diverge once a newer LTS is
    released while the CI runner is still on the previous one (e.g. runner on
    noble while the latest LTS, and therefore the upload target, is resolute).
    """
    if UbuntuDistroInfo is None:
        raise ImportError(
            "distro-info package is required. "
            "Install with: sudo apt install python3-distro-info"
        )
    return UbuntuDistroInfo().lts()


def get_supported_series(source_series, include_esm=True):
    """Discover supported Ubuntu series using distro_info, excluding source_series."""
    if UbuntuDistroInfo is None:
        raise ImportError(
            "distro-info package is required. "
            "Install with: sudo apt install python3-distro-info"
        )
    ubuntu = UbuntuDistroInfo()
    series = set(ubuntu.supported())
    if not include_esm:
        today = datetime.datetime.now(datetime.timezone.utc).date()
        series &= {
            d.series
            for d in ubuntu.get_all("object")
            if d.release is not None and d.release <= today
        }
    else:
        try:
            esm_series = ubuntu.supported_esm()
            if esm_series:
                series |= set(esm_series)
        except (AttributeError, TypeError):
            pass
    series.discard(source_series)
    result = sorted(series)
    log.info("Dynamic series discovery via distro_info:")
    log.info("  Target series (will copy to): %s", ", ".join(result))
    return result


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
        return f"\n{elapsed:.3f}s ({delta:+.3f}s) [{REQUESTS}/+{delta_requests}] {msg}"


def enable_http_debugging():
    if httplib2 is not None:
        httplib2.debuglevel = 1


def install_request_counter():
    if httplib2 is None:
        return
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

    def __init__(self, source_package, binary_package):
        self.source_package = source_package
        self.binary_package = binary_package
        self.queue = defaultdict(set)
        self._series = {}

    @functools.cached_property
    def lp(self):
        if Launchpad is None:
            raise ImportError(
                "launchpadlib is required. "
                "Install with: sudo apt install python3-launchpadlib"
            )
        log.debug("Logging in...")
        credentials_file = os.environ.get("LP_CREDENTIALS_FILE")
        return Launchpad.login_with(
            application_name=APP_NAME,
            service_root="production",
            credentials_file=credentials_file,
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

    def _drop_stale_connections(self):
        """Discard cached HTTP sockets so the next API call reconnects.

        Launchpad closes idle keep-alive connections; reusing a stale socket
        after a long polling interval raises ssl.SSLEOFError. Clearing the
        httplib2 connection cache forces a fresh connection on the next request.
        Best-effort: the private attribute path may vary across launchpadlib
        versions, so failures here are non-fatal (the retry still reconnects).
        """
        try:
            self.lp._browser._connection.connections.clear()
        except Exception:
            pass

    def _retry_transient(self, label, call):
        """Run ``call()``, retrying transient network errors with backoff.

        A single connection blip (e.g. a stale keep-alive socket raising
        ssl.SSLEOFError between polls) should not abort the whole release wait.
        Reconnects and retries up to TRANSIENT_RETRY_ATTEMPTS times; re-raises
        if every attempt fails (a sustained outage should fail loudly).
        """
        for attempt in range(1, TRANSIENT_RETRY_ATTEMPTS):
            try:
                return call()
            except TRANSIENT_ERRORS as e:
                delay = TRANSIENT_RETRY_BACKOFF * attempt
                log.warning(
                    "Transient error during %s (attempt %d/%d): %s; "
                    "reconnecting, retrying in %ds...",
                    label,
                    attempt,
                    TRANSIENT_RETRY_ATTEMPTS,
                    e,
                    delay,
                )
                self._drop_stale_connections()
                time.sleep(delay)
        return call()

    @functools.cached_property
    def proposed_ppa(self):
        return self.get_ppa(PROPOSED_PPA_NAME)

    @functools.cached_property
    def release_ppa(self):
        return self.get_ppa(RELEASE_PPA_NAME)

    def get_series(self, name):
        if name not in self._series:
            ppa = self.proposed_ppa
            log.debug("Locating the series: %s...", name)
            self._series[name] = ppa.distribution.getSeries(name_or_version=name)
        return self._series[name]

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

    def get_builds_for(self, ppa, name, version, series_name):
        source = self.get_source_for(ppa, name, version, series_name)
        if not source:
            return None
        return self.get_builds_for_source(source)

    def has_published_binaries(self, ppa, name, version, series_name):
        builds = self.get_builds_for(ppa, name, version, series_name)
        return bool(builds) and builds[0].buildstate == "Successfully built"

    def get_usable_sources(self, ppa, series_name):
        res = []
        for source in self.get_published_sources(ppa, series_name):
            name = source.source_package_name
            if name != self.source_package:
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
        for (_source_series, target_series, pocket), packages in self.queue.items():
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
            except Exception as e:
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

    def _inspect_target_series(
        self, ppa, name, version, source_series, target_series_name
    ):
        """Inspect one target series, queueing a copy when the package is missing.

        Returns ``(mentioned, notice)`` where ``mentioned`` is True when the
        package is absent from the target series and ``notice`` is an explanatory
        string to log (or None).
        """
        source = self.get_source_for(ppa, name, version, target_series_name)
        if source is None:
            log.info("%s %s missing from %s", name, version, target_series_name)
            if self.has_published_binaries(ppa, name, version, source_series):
                self.queue_copy(
                    name, version, source_series, target_series_name, POCKET
                )
            else:
                builds = self.get_builds_for(ppa, name, version, source_series)
                if builds:
                    log.info(
                        "  but it isn't built yet (state: %s) - %s",
                        builds[0].buildstate,
                        builds[0].web_link,
                    )
            return True, None
        if source.status != "Published":
            return False, f"  but it is {source.status.lower()} in {target_series_name}"
        if not self.has_published_binaries(ppa, name, version, target_series_name):
            builds = self.get_builds_for(ppa, name, version, target_series_name)
            if builds:
                return (
                    False,
                    f"  but it isn't built yet for {target_series_name} (state: {builds[0].buildstate}) - {builds[0].web_link}",
                )
        return False, None

    def copy_to_series(self, source_series=None, include_esm=True):
        """Copy packages from source series to all other supported Ubuntu series."""
        source_series = source_series or get_current_series()
        log.info(
            "Spinning up the Launchpad API to copy targets in %s (source series: %s)",
            self.source_package,
            source_series,
        )

        ppa = self.proposed_ppa
        target_series_names = get_supported_series(source_series, include_esm)

        for name, version in self.get_usable_sources(ppa, source_series):
            mentioned = False
            notices = []
            for target_series_name in target_series_names:
                was_mentioned, notice = self._inspect_target_series(
                    ppa, name, version, source_series, target_series_name
                )
                mentioned = mentioned or was_mentioned
                if notice:
                    notices.append(notice)
            if not mentioned or notices:
                log.info("%s %s", name, version)
                for notice in notices:
                    log.info(notice)

        result = self.perform_queued_copies(ppa)
        log.debug("All done")
        return result

    def check_source(self, version, ppa_name=None):
        """Check if a source package version exists in a PPA.

        Returns 0 if found (already uploaded), 1 if missing, 2 on error.
        """
        ppa_name = ppa_name or PROPOSED_PPA_NAME
        try:
            ppa = self.get_ppa(ppa_name)
            published = ppa.getPublishedSources(
                source_name=self.source_package,
                exact_match=True,
                version=version,
                order_by_date=True,
            )
            active = [
                s
                for s in published
                if s.status not in ("Deleted", "Superseded", "Obsolete")
            ]
        except Exception as e:
            log.error(
                "Error checking %s %s in %s: %s",
                self.source_package,
                version,
                ppa_name,
                e,
            )
            return 2
        if active:
            log.info(
                "%s %s already exists in %s (status: %s)",
                self.source_package,
                version,
                ppa_name,
                active[0].status,
            )
            return 0
        log.info("%s %s not found in %s", self.source_package, version, ppa_name)
        return 1

    def wait_for_published(
        self, version, ppa_name=None, series=None, timeout=1800, interval=60
    ):
        """Wait for published binaries to appear for the package.

        If series is given, waits for those specific series to have published binaries.
        If series is None, discovers all series that have a published source for this
        version and waits until every one of them also has published binaries.
        Returns 0 if all expected series are published, 1 on failure or timeout.
        """
        ppa_name = ppa_name or PROPOSED_PPA_NAME
        ppa = self.get_ppa(ppa_name)
        deadline = time.time() + timeout
        expected = set(series) if series else None

        log.info(
            "Waiting for %s %s to be published in %s%s...",
            self.binary_package,
            version,
            ppa_name,
            f" for series: {', '.join(sorted(expected))}" if expected else "",
        )

        while time.time() < deadline:
            # If no explicit series, discover from published sources
            if expected is None:
                sources = self._retry_transient(
                    "getPublishedSources",
                    lambda: ppa.getPublishedSources(
                        source_name=self.source_package,
                        exact_match=True,
                        version=version,
                        order_by_date=True,
                    ),
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
                log.info(
                    "Discovered %d series with sources: %s",
                    len(expected),
                    ", ".join(sorted(expected)),
                )

            # Check published binaries
            bins = self._retry_transient(
                "getPublishedBinaries",
                lambda: ppa.getPublishedBinaries(
                    binary_name=self.binary_package,
                    exact_match=True,
                    version=version,
                    order_by_date=True,
                ),
            )
            published_series = set()
            for b in bins:
                if b.status == "Published":
                    # distro_arch_series_link: .../ubuntu/noble/amd64
                    series_name = b.distro_arch_series_link.rstrip("/").split("/")[-2]
                    published_series.add(series_name)

            missing = expected - published_series
            if not missing:
                log.info(
                    "All %d series published: %s",
                    len(expected),
                    ", ".join(sorted(published_series)),
                )
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

        log.error(
            "Timeout: %s %s not published within %ds",
            self.binary_package,
            version,
            timeout,
        )
        return 1

    def promote(self, version):
        """Promote published packages from kolibri-proposed to kolibri PPA."""
        log.info(
            "Promoting packages from %s to %s", PROPOSED_PPA_NAME, RELEASE_PPA_NAME
        )

        source_ppa = self.proposed_ppa
        dest_ppa = self.release_ppa

        packages = source_ppa.getPublishedSources(
            status="Published", order_by_date=True
        )

        series_names = set()
        for pkg in packages:
            if pkg.source_package_name != self.source_package:
                continue
            if pkg.source_package_version != version:
                continue
            series_name = pkg.distro_series_link.rstrip("/").split("/")[-1]
            series_names.add(series_name)

        if not series_names:
            log.error(
                "No eligible %s %s found in %s",
                self.source_package,
                version,
                PROPOSED_PPA_NAME,
            )
            return 1

        failures = []
        for series_name in sorted(series_names):
            log.info(
                "Promoting %s from %s to %s",
                self.source_package,
                series_name,
                RELEASE_PPA_NAME,
            )
            try:
                dest_ppa.syncSources(
                    from_archive=source_ppa,
                    to_series=series_name,
                    to_pocket=POCKET,
                    include_binaries=True,
                    source_names=[self.source_package],
                )
            except Exception as e:
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
    parser = argparse.ArgumentParser(
        description="Launchpad PPA copy tool for Kolibri packages."
    )
    # Required so neither release pipeline can act on the other's package.
    parser.add_argument(
        "--source-package", required=True, help="Launchpad source package name."
    )
    parser.add_argument(
        "--binary-package",
        required=True,
        help="Binary package the source builds (debian/control Package).",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="count",
        default=0,
        help="Increase verbosity (use -vv for debug).",
    )
    parser.add_argument(
        "-q", "--quiet", action="store_true", help="Suppress info output."
    )
    parser.add_argument(
        "--debug", action="store_true", help="Enable HTTP debug output."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    copy_parser = subparsers.add_parser(
        "copy-to-series",
        help="Copy packages from source series to all other supported series within a PPA.",
    )
    copy_parser.add_argument(
        "--series",
        default=None,
        help="Source series override (default: current LTS).",
    )
    copy_parser.add_argument(
        "--no-esm",
        action="store_true",
        help="Do not copy to ESM-only or unreleased series.",
    )

    promote_parser = subparsers.add_parser(
        "promote",
        help="Promote published packages from kolibri-proposed to kolibri PPA.",
    )
    promote_parser.add_argument("--version", required=True, help="Version to promote.")

    wait_parser = subparsers.add_parser(
        "wait-for-published",
        help="Wait for published binaries to appear for a source package.",
    )
    wait_parser.add_argument(
        "--version", required=True, help="Expected version string."
    )
    wait_parser.add_argument(
        "--ppa",
        default=PROPOSED_PPA_NAME,
        help="PPA name to poll (default: %(default)s).",
    )
    wait_parser.add_argument(
        "--timeout",
        type=int,
        default=1800,
        help="Max wait in seconds (default: %(default)s).",
    )
    wait_parser.add_argument(
        "--interval",
        type=int,
        default=60,
        help="Polling interval in seconds (default: %(default)s).",
    )
    wait_parser.add_argument(
        "--series", nargs="+", default=None, help="Series to wait for (default: any)."
    )

    check_parser = subparsers.add_parser(
        "check-source",
        help="Check if a source package version already exists in a PPA.",
    )
    check_parser.add_argument(
        "--version", required=True, help="Expected version string."
    )
    check_parser.add_argument(
        "--ppa",
        default=PROPOSED_PPA_NAME,
        help="PPA name to check (default: %(default)s).",
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
    lp = LaunchpadWrapper(args.source_package, args.binary_package)
    return lp.copy_to_series(source_series=args.series, include_esm=not args.no_esm)


def cmd_wait_for_published(args):
    """Wait for published binaries to appear."""
    lp = LaunchpadWrapper(args.source_package, args.binary_package)
    return lp.wait_for_published(
        version=args.version,
        ppa_name=args.ppa,
        series=args.series,
        timeout=args.timeout,
        interval=args.interval,
    )


def cmd_check_source(args):
    """Check if a source package version already exists in a PPA."""
    lp = LaunchpadWrapper(args.source_package, args.binary_package)
    return lp.check_source(
        version=args.version,
        ppa_name=args.ppa,
    )


def cmd_promote(args):
    """Promote published packages from kolibri-proposed to kolibri PPA."""
    lp = LaunchpadWrapper(args.source_package, args.binary_package)
    return lp.promote(version=args.version)


def main():
    parser = build_parser()
    args = parser.parse_args()
    configure_logging(args)

    if args.command == "copy-to-series":
        return cmd_copy_to_series(args)
    if args.command == "check-source":
        return cmd_check_source(args)
    if args.command == "promote":
        return cmd_promote(args)
    if args.command == "wait-for-published":
        return cmd_wait_for_published(args)
    return None


if __name__ == "__main__":
    raise SystemExit(main())
