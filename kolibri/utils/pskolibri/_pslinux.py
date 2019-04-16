"""Linux platform implementation."""
from __future__ import absolute_import
from __future__ import division

import errno
import functools
import os
import re
import sys
from collections import namedtuple

from kolibri.utils.pskolibri.common import AccessDenied
from kolibri.utils.pskolibri.common import b
from kolibri.utils.pskolibri.common import memoize
from kolibri.utils.pskolibri.common import memoize_when_activated
from kolibri.utils.pskolibri.common import NoSuchProcess
from kolibri.utils.pskolibri.common import open_binary
from kolibri.utils.pskolibri.common import open_text
from kolibri.utils.pskolibri.common import pcputimes

CLOCK_TICKS = os.sysconf("SC_CLK_TCK")
PAGESIZE = os.sysconf("SC_PAGE_SIZE")
BOOT_TIME = None  # set later

svmem = namedtuple("svmem", ["total", "used"])
pmem = namedtuple("pmem", "rss vms shared text lib data dirty")


def get_procfs_path():
    """Return updated psutil.PROCFS_PATH constant."""
    return sys.modules["kolibri.utils.pskolibri"].PROCFS_PATH


@memoize
def set_scputimes_ntuple(procfs_path):
    """Set a namedtuple of variable fields depending on the CPU times
    available on this Linux kernel version which may be:
    (user, nice, system, idle, iowait, irq, softirq, [steal, [guest,
     [guest_nice]]])
    Used by cpu_times() function.
    """
    global scputimes
    with open_binary("%s/stat" % procfs_path) as f:
        values = f.readline().split()[1:]
    fields = ["user", "nice", "system", "idle", "iowait", "irq", "softirq"]
    vlen = len(values)
    if vlen >= 8:
        # Linux >= 2.6.11
        fields.append("steal")
    if vlen >= 9:
        # Linux >= 2.6.24
        fields.append("guest")
    if vlen >= 10:
        # Linux >= 3.2.0
        fields.append("guest_nice")
    scputimes = namedtuple("scputimes", fields)


def cpu_times():
    """Return a named tuple representing the following system-wide
    CPU times:
    (user, nice, system, idle, iowait, irq, softirq [steal, [guest,
     [guest_nice]]])
    Last 3 fields may not be available on all Linux kernel versions.
    """
    procfs_path = get_procfs_path()
    set_scputimes_ntuple(procfs_path)
    with open_binary("%s/stat" % procfs_path) as f:
        values = f.readline().split()
    fields = values[1 : len(scputimes._fields) + 1]
    fields = [float(x) / CLOCK_TICKS for x in fields]
    return scputimes(*fields)


def virtual_memory():
    """Report virtual memory stats.
    This implementation matches "free" and "vmstat -s" cmdline
    utility values and procps-ng-3.3.12 source was used as a reference
    (2016-09-18):
    https://gitlab.com/procps-ng/procps/blob/
        24fd2605c51fccc375ab0287cec33aa767f06718/proc/sysinfo.c
    For reference, procps-ng-3.3.10 is the version available on Ubuntu
    16.04.

    Note about "available" memory: up until psutil 4.3 it was
    calculated as "avail = (free + buffers + cached)". Now
    "MemAvailable:" column (kernel 3.14) from /proc/meminfo is used as
    it's more accurate.
    That matches "available" column in newer versions of "free".
    """
    missing_fields = []
    mems = {}
    with open_binary("%s/meminfo" % get_procfs_path()) as f:
        for line in f:
            fields = line.split()
            mems[fields[0]] = int(fields[1]) * 1024

    # /proc doc states that the available fields in /proc/meminfo vary
    # by architecture and compile options, but these 3 values are also
    # returned by sysinfo(2); as such we assume they are always there.
    total = mems[b"MemTotal:"]
    free = mems[b"MemFree:"]
    try:
        buffers = mems[b"Buffers:"]
    except KeyError:
        buffers = 0
        missing_fields.append("buffers")
    try:
        cached = mems[b"Cached:"]
    except KeyError:
        cached = 0
        missing_fields.append("cached")
    else:
        cached += mems.get(b"SReclaimable:", 0)  # since kernel 2.6.19

    used = total - free - cached - buffers
    if used < 0:
        # May be symptomatic of running within a LCX container where such
        # values will be dramatically distorted over those of the host.
        used = total - free

    return svmem(total, used)


def pids():
    """Returns a list of PIDs currently running on the system."""
    return [int(x) for x in os.listdir(b(get_procfs_path())) if x.isdigit()]


def cpu_count_logical():
    """Return the number of logical CPUs in the system."""
    try:
        return os.sysconf("SC_NPROCESSORS_ONLN")
    except ValueError:
        # as a second fallback we try to parse /proc/cpuinfo
        num = 0
        with open_binary("%s/cpuinfo" % get_procfs_path()) as f:
            for line in f:
                if line.lower().startswith(b"processor"):
                    num += 1

        # unknown format (e.g. amrel/sparc architectures), see:
        # https://github.com/giampaolo/psutil/issues/200
        # try to parse /proc/stat as a last resort
        if num == 0:
            search = re.compile(r"cpu\d")
            with open_text("%s/stat" % get_procfs_path()) as f:
                for line in f:
                    line = line.split(" ")[0]
                    if search.match(line):
                        num += 1

        if num == 0:
            # mimic os.cpu_count()
            return None
        return num


def wrap_exceptions(fun):
    """Decorator which translates bare OSError and IOError exceptions
    into NoSuchProcess and AccessDenied.
    """

    @functools.wraps(fun)
    def wrapper(self, *args, **kwargs):
        try:
            return fun(self, *args, **kwargs)
        except EnvironmentError as err:
            if err.errno in (errno.EPERM, errno.EACCES):
                raise AccessDenied()
            # ESRCH (no such process) can be raised on read() if
            # process is gone in the meantime.
            if err.errno == errno.ESRCH:
                raise NoSuchProcess()
            # ENOENT (no such file or directory) can be raised on open().
            if err.errno == errno.ENOENT and not os.path.exists(
                "%s/%s" % (self._procfs_path, self.pid)
            ):
                raise NoSuchProcess()
            # Note: zombies will keep existing under /proc until they're
            # gone so there's no way to distinguish them in here.
            raise

    return wrapper


def boot_time():
    """Return the system boot time expressed in seconds since the epoch."""
    global BOOT_TIME
    path = "%s/stat" % get_procfs_path()
    with open_binary(path) as f:
        for line in f:
            if line.startswith(b"btime"):
                ret = float(line.strip().split()[1])
                BOOT_TIME = ret
                return ret
        raise RuntimeError("line 'btime' not found in %s" % path)


class Process(object):
    """Linux process implementation."""

    __slots__ = ["pid", "_name", "_ppid", "_procfs_path"]

    def __init__(self, pid):
        self.pid = pid
        self._name = None
        self._ppid = None
        self._procfs_path = get_procfs_path()

    @memoize_when_activated
    def _parse_stat_file(self):
        """Parse /proc/{pid}/stat file. Return a list of fields where
        process name is in position 0.
        Using "man proc" as a reference: where "man proc" refers to
        position N, always substract 2 (e.g starttime pos 22 in
        'man proc' == pos 20 in the list returned here).
        The return value is cached in case oneshot() ctx manager is
        in use.
        """
        with open_binary("%s/%s/stat" % (self._procfs_path, self.pid)) as f:
            data = f.read()
        # Process name is between parentheses. It can contain spaces and
        # other parentheses. This is taken into account by looking for
        # the first occurrence of "(" and the last occurence of ")".
        rpar = data.rfind(b")")
        name = data[data.find(b"(") + 1 : rpar]
        others = data[rpar + 2 :].split()
        return [name] + others

    @wrap_exceptions
    def cmdline(self):
        with open_text("%s/%s/cmdline" % (self._procfs_path, self.pid)) as f:
            data = f.read()
        if not data:
            # may happen in case of zombie process
            return []
        sep = "\x00" if data.endswith("\x00") else " "
        if data.endswith(sep):
            data = data[:-1]
        return [x for x in data.split(sep)]

    @wrap_exceptions
    def create_time(self):
        values = self._parse_stat_file()
        # According to documentation, starttime is in field 21 and the
        # unit is jiffies (clock ticks).
        # We first divide it for clock ticks and then add uptime returning
        # seconds since the epoch, in UTC.
        # Also use cached value if available.
        bt = BOOT_TIME or boot_time()
        return (float(values[20]) / CLOCK_TICKS) + bt

    @wrap_exceptions
    def memory_info(self):
        #  ============================================================
        # | FIELD  | DESCRIPTION                         | AKA  | TOP  |
        #  ============================================================
        # | rss    | resident set size                   |      | RES  |
        # | vms    | total program size                  | size | VIRT |
        # | shared | shared pages (from shared mappings) |      | SHR  |
        # | text   | text ('code')                       | trs  | CODE |
        # | lib    | library (unused in Linux 2.6)       | lrs  |      |
        # | data   | data + stack                        | drs  | DATA |
        # | dirty  | dirty pages (unused in Linux 2.6)   | dt   |      |
        #  ============================================================
        with open_binary("%s/%s/statm" % (self._procfs_path, self.pid)) as f:
            vms, rss, shared, text, lib, data, dirty = [
                int(x) * PAGESIZE for x in f.readline().split()[:7]
            ]
        return pmem(rss, vms, shared, text, lib, data, dirty)

    @wrap_exceptions
    def cpu_times(self):
        values = self._parse_stat_file()
        utime = float(values[12]) / CLOCK_TICKS
        stime = float(values[13]) / CLOCK_TICKS
        children_utime = float(values[14]) / CLOCK_TICKS
        children_stime = float(values[15]) / CLOCK_TICKS
        return pcputimes(utime, stime, children_utime, children_stime)
