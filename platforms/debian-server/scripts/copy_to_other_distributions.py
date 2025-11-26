#!/usr/bin/python
"""Copy published precise PPA packages to other configured active dists in Launchpad.

Note on Xenial: Builds on Xenial may break, so we build for Bionic and copy binaries
for Xenial. See: https://github.com/learningequality/kolibri-server/pull/9

Typical usage:

    - build a kolibri-server package for bionic
    - dput ppa:build/kolibri-server-source_0.9.0~b2-0ubuntu1_source.changes
    - wait for it to be built
    - run python ppa-copy-packages.py

Based on https://gist.github.com/mgedmin/7689218
"""

import functools
import logging
import optparse
import sys
import time
from collections import defaultdict
import subprocess

import os
from launchpadlib.launchpad import Launchpad


#
# Hardcoded configuration
#

PPA_OWNER = 'learningequality'
PPA_NAME = 'kolibri-proposed'
PACKAGE_WHITELIST = ['kolibri-server']

SOURCE_SERIES = 'jammy'
## Fall back if dynamic fetching does not work.
TARGET_SERIESES = ["plucky", "noble", "jammy", "focal"]
POCKET = 'Release'

APP_NAME = 'ppa-kolibri-server-copy-packages'


log = logging.getLogger(APP_NAME)

STARTUP_TIME = LAST_LOG_TIME = time.time()
REQUESTS = LAST_REQUESTS = 0


def get_launchpad_client():
    # If LP_CREDENTIALS_FILE is set, launchpadlib will automatically use it.
    # Use the same application name as used to create credentials.
    return Launchpad.login_with(
        application_name="ppa-kolibri-server-jammy-package",
        service_root="production",
    )


def get_supported_series_dynamically(source_series):
    try:
        out = subprocess.check_output(["ubuntu-distro-info", "--supported"], text=True).strip()
        all_series = out.split()
        series = [s for s in all_series if s and s != source_series]
        log.info("Dynamic series discovery:")
        log.info("  Target series (will copy to): %s", ', '.join(series))
        return series
    except Exception as e:
        log.warning("Failed to get dynamic series list: %s", e)
        log.info("Falling back to hardcoded target series: %s", ', '.join(TARGET_SERIESES))
        return TARGET_SERIESES


class DebugFormatter(logging.Formatter):

    def format(self, record):
        global LAST_LOG_TIME, LAST_REQUESTS
        msg = super(DebugFormatter, self).format(record)
        if msg.startswith("  "):  # continuation of previous message
            return msg
        now = time.time()
        elapsed = now - STARTUP_TIME
        delta = now - LAST_LOG_TIME
        LAST_LOG_TIME = now
        delta_requests = REQUESTS - LAST_REQUESTS
        LAST_REQUESTS = REQUESTS
        return "\n%.3fs (%+.3fs) [%d/+%d] %s" % (elapsed, delta, REQUESTS, delta_requests, msg)


def enable_http_debugging():
    import httplib2
    httplib2.debuglevel = 1


def install_request_counter():
    import httplib2
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


#
# Caching decorators
#

class once(object):
    """A @property that is computed only once per instance.

    Also known as @reify in Pyramid and @Lazy in Zope.
    """

    def __init__(self, fn):
        self.fn = fn

    def __get__(self, obj, type=None):
        value = self.fn(obj)
        # Put the value in the instance __dict__.  Since the once
        # descriptor has no __set__ and is therefore not a data
        # descriptor, instance __dict__ will take precedence on
        # subsequent attribute accesses.
        setattr(obj, self.fn.__name__, value)
        return value


def cache(fn):
    """Trivial memoization decorator."""
    cache = fn.cache = {}

    @functools.wraps(fn)
    def inner(*args):
        # The way we use the cache is suboptimal for methods: it is
        # shared between all instances, but the instance is part of
        # the cache lookup key, negating any advantage of the sharing.
        # Luckily in this script there's only one instance.
        try:
            return cache[args]
        except KeyError:
            value = cache[args] = fn(*args)
            return value
        except TypeError:
            raise TypeError('%s argument types preclude caching: %s' %
                            (fn.__name__, repr(args)))

    return inner


#
# Launchpad API wrapper with heavy caching
#


class LaunchpadWrapper(object):
    application_name = 'ppa-kolibri-server-copy-packages'
    launchpad_instance = 'production'

    ppa_owner = PPA_OWNER
    ppa_name = PPA_NAME

    def __init__(self):
        self.queue = defaultdict(set)

    # Trivial caching wrappers for Launchpad API
    @once
    def lp(self):
        log.debug("Logging in...")
        # cost: 2 HTTP requests
        return get_launchpad_client()

    @once
    def owner(self):
        lp = self.lp  # ensure correct ordering of debug messages
        log.debug("Getting the owner...")
        # cost: 1 HTTP request
        return lp.people[self.ppa_owner]

    @once
    def ppa(self):
        owner = self.owner  # ensure correct ordering of debug messages
        log.debug("Getting the PPA...")
        # cost: 1 HTTP request
        return owner.getPPAByName(name=self.ppa_name)

    @cache
    def get_series(self, name):
        ppa = self.ppa  # ensure correct ordering of debug messages
        log.debug("Locating the series: %s...", name)
        # cost: 1 HTTP request
        return ppa.distribution.getSeries(name_or_version=name)

    @cache
    def get_published_sources(self, series_name):
        series = self.get_series(series_name)
        log.debug("Listing source packages for %s...", series_name)
        # cost: 1 HTTP request
        return self.ppa.getPublishedSources(distro_series=series)

    @cache
    def get_builds_for_source(self, source):
        log.debug("Listing %s builds for %s %s...",
                  source.distro_series_link.rpartition('/')[-1],
                  source.source_package_name,
                  source.source_package_version)
        # cost: 1 HTTP request, plus another one for accessing the list
        return source.getBuilds()

    @cache
    def get_source_packages(self, series_name, package_names=None):
        """Return {package_name: {version: 'Status', ...}, ...}"""
        res = defaultdict(dict)
        for source in self.get_published_sources(series_name):
            name = source.source_package_name
            if package_names is not None and name not in package_names:
                continue
            version = source.source_package_version
            res[name][version] = source
        return res

    def get_source_for(self, name, version, series_name):
        sources = self.get_source_packages(series_name)
        return sources.get(name, {}).get(version)

    def is_missing(self, name, version, series_name):
        return self.get_source_for(name, version, series_name) is None

    def get_builds_for(self, name, version, series_name):
        source = self.get_source_for(name, version, series_name)
        if not source:
            return None
        return self.get_builds_for_source(source)

    def has_published_binaries(self, name, version, series_name):
        builds = self.get_builds_for(name, version, series_name)
        return not builds or builds[0].buildstate == u'Successfully built'

    @cache
    def get_usable_sources(self, package_names, series_name):
        res = []
        for source in self.get_published_sources(series_name):
            name = source.source_package_name
            if name not in package_names:
                continue
            version = source.source_package_version
            if source.status in ('Superseded', 'Deleted', 'Obsolete'):
                log.info("%s %s is %s in %s", name, version,
                         source.status.lower(), series_name)
                continue
            if source.status != ('Published'):
                log.warning("%s %s is %s in %s", name, version,
                            source.status.lower(), series_name)
                continue
            res.append((name, version))
        return res

    def queue_copy(self, name, source_series, target_series, pocket):
        self.queue[source_series, target_series, pocket].add(name)

    def perform_queued_copies(self):
        first = True
        for (source_series, target_series, pocket), names in self.queue.items():
            if not names:
                continue
            if first:
                log.info("")
                first = False
            log.info("Copying %s to %s", ', '.join(sorted(names)),
                     target_series)
            self.ppa.syncSources(from_archive=self.ppa,
                                 to_series=target_series,
                                 to_pocket=pocket,
                                 include_binaries=True,
                                 source_names=sorted(names))


def main():
    parser = optparse.OptionParser('usage: %prog [options]',
        description="copy ppa:%s/%s packages from %s to %s"
                    % (PPA_OWNER, PPA_NAME, SOURCE_SERIES, ', '.join(TARGET_SERIESES)))
    parser.add_option('-v', '--verbose', action='count')
    parser.add_option('-q', '--quiet', action='store_true')
    parser.add_option('--debug', action='store_true')
    opts, args = parser.parse_args()

    if opts.quiet:
        set_up_logging(logging.WARNING)
    elif opts.debug:
        enable_http_debugging()
        install_request_counter()
        set_up_logging(logging.DEBUG)
    elif opts.verbose > 1:
        install_request_counter()
        set_up_logging(logging.DEBUG)
    else:
        set_up_logging(logging.INFO)

    log.info("Spinning up the Launchpad API to copy targets in {}".format(", ".join(PACKAGE_WHITELIST)))

    lp = LaunchpadWrapper()

    for (name, version) in lp.get_usable_sources(tuple(PACKAGE_WHITELIST),
                                                 SOURCE_SERIES):
        mentioned = False
        notices = []
        target_series_names = get_supported_series_dynamically(SOURCE_SERIES)
        for target_series_name in target_series_names:
            source = lp.get_source_for(name, version, target_series_name)
            if source is None:
                mentioned = True
                log.info("%s %s missing from %s", name, version,
                         target_series_name)
                if lp.has_published_binaries(name, version,
                                             SOURCE_SERIES):
                    lp.queue_copy(name, SOURCE_SERIES,
                                  target_series_name, POCKET)
                else:
                    builds = lp.get_builds_for(name, version, SOURCE_SERIES)
                    if builds:
                        log.info("  but it isn't built yet (state: %s) - %s",
                                 builds[0].buildstate, builds[0].web_link)
            elif source.status != 'Published':
                notices.append("  but it is %s in %s" %
                               (source.status.lower(), target_series_name))
            elif not lp.has_published_binaries(name, version, target_series_name):
                builds = lp.get_builds_for(name, version, target_series_name)
                if builds:
                    notices.append("  but it isn't built yet for %s (state: %s) - %s" %
                                   (target_series_name, builds[0].buildstate,
                                   builds[0].web_link))
        if not mentioned or notices:
            log.info("%s %s", name, version)
            for notice in notices:
                log.info(notice)

    lp.perform_queued_copies()

    log.debug("All done")


if __name__ == '__main__':
    main()


