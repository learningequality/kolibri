"""Windows platform implementation."""
from __future__ import absolute_import
from __future__ import division

import ctypes
import errno
import functools
import subprocess
from collections import namedtuple
from ctypes import windll
from ctypes import wintypes

from kolibri.utils.pskolibri.common import AccessDenied
from kolibri.utils.pskolibri.common import NoSuchProcess
from kolibri.utils.pskolibri.common import pcputimes


def check_zero(result, func, args):
    if not result:
        err = ctypes.get_last_error()
        if err:
            raise ctypes.WinError(err)
    return args


kernel32 = windll.kernel32
psapi = ctypes.windll.psapi
psapi.EnumProcesses.errcheck = check_zero
psapi.EnumProcesses.argtypes = (
    wintypes.LPDWORD,  # _Out_ pProcessIds
    wintypes.DWORD,  # _In_  cb
    wintypes.LPDWORD,
)  # _Out_ pBytesReturned

svmem = namedtuple("svmem", ["total", "used"])
scputimes = namedtuple("scputimes", ["user", "system", "idle"])
pmem = namedtuple(
    "pmem",
    [
        "rss",
        "vms",
        "num_page_faults",
        "peak_wset",
        "wset",
        "peak_paged_pool",
        "paged_pool",
        "peak_nonpaged_pool",
        "nonpaged_pool",
        "pagefile",
        "peak_pagefile",
    ],
)


class SYSTEM_INFO(ctypes.Structure):
    _fields_ = (
        ("wProcessorArchitecture", wintypes.WORD),
        ("wReserved", wintypes.WORD),
        ("dwPageSize", wintypes.DWORD),
        ("lpMinimumApplicationAddress", wintypes.LPVOID),
        ("lpMaximumApplicationAddress", wintypes.LPVOID),
        ("dwActiveProcessorMask", wintypes.LPVOID),
        ("dwNumberOfProcessors", wintypes.DWORD),
        ("dwProcessorType", wintypes.DWORD),
        ("dwAllocationGranularity", wintypes.DWORD),
        ("wProcessorLevel", wintypes.WORD),
        ("wProcessorRevision", wintypes.WORD),
    )


class MEMORYSTATUSEX(ctypes.Structure):
    _fields_ = [
        ("dwLength", ctypes.c_ulong),
        ("dwMemoryLoad", ctypes.c_ulong),
        ("ullTotalPhys", ctypes.c_ulonglong),
        ("ullAvailPhys", ctypes.c_ulonglong),
        ("ullTotalPageFile", ctypes.c_ulonglong),
        ("ullAvailPageFile", ctypes.c_ulonglong),
        ("ullTotalVirtual", ctypes.c_ulonglong),
        ("ullAvailVirtual", ctypes.c_ulonglong),
        ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
    ]

    def __init__(self):
        # have to initialize this to the size of MEMORYSTATUSEX
        self.dwLength = ctypes.sizeof(self)
        super(MEMORYSTATUSEX, self).__init__()


class FILETIME(ctypes.Structure):
    _fields_ = [("dwLowDateTime", wintypes.DWORD), ("dwHighDateTime", wintypes.DWORD)]


class PROCESS_MEMORY_COUNTERS_EX(ctypes.Structure):
    _fields_ = [
        ("cb", wintypes.DWORD),
        ("PageFaultCount", wintypes.DWORD),
        ("PeakWorkingSetSize", ctypes.c_size_t),
        ("WorkingSetSize", ctypes.c_size_t),
        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
        ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
        ("PagefileUsage", ctypes.c_size_t),
        ("PeakPagefileUsage", ctypes.c_size_t),
        ("PrivateUsage", ctypes.c_size_t),
    ]


ERROR_ACCESS_DENIED = 5
ACCESS_DENIED_ERRSET = frozenset([errno.EPERM, errno.EACCES, ERROR_ACCESS_DENIED])
PROCESS_QUERY_INFORMATION = 0x400
PROCESS_VM_READ = 0x0010
LO_T = 1e-7
HI_T = 429.4967296


def cpu_times():
    """Return system CPU times as a named tuple."""
    idle_time, kernel_time, user_time = FILETIME(), FILETIME(), FILETIME()
    kernel32.GetSystemTimes(
        ctypes.byref(idle_time), ctypes.byref(kernel_time), ctypes.byref(user_time)
    )

    idle = HI_T * idle_time.dwHighDateTime + LO_T * idle_time.dwLowDateTime
    user = HI_T * user_time.dwHighDateTime + LO_T * user_time.dwLowDateTime
    kernel = HI_T * kernel_time.dwHighDateTime + LO_T * kernel_time.dwLowDateTime
    # Kernel time includes idle time.
    # We return only busy kernel time subtracting idle time from
    # kernel time.
    system = kernel - idle

    return scputimes(user, system, idle)


def virtual_memory():
    """System virtual memory as a namedtuple."""
    meminfo = MEMORYSTATUSEX()
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(meminfo))
    total = meminfo.ullTotalPhys
    avail = meminfo.ullAvailPhys
    used = total - avail

    return svmem(total, used)


def pids():
    """Returns a list of PIDs currently running on the system."""
    length = 4096
    PID_SIZE = ctypes.sizeof(wintypes.DWORD)
    while True:
        pids = (wintypes.DWORD * length)()
        cb = ctypes.sizeof(pids)
        cbret = wintypes.DWORD()
        psapi.EnumProcesses(pids, cb, ctypes.byref(cbret))
        if cbret.value < cb:
            length = cbret.value // PID_SIZE
            return list(pids[:length])
        length *= 2


def cpu_count_logical():
    ncpus = 0
    hKernel32 = kernel32.GetModuleHandleA("KERNEL32")
    address = kernel32.GetProcAddress(hKernel32, "GetActiveProcessorCount")
    kernel32.CloseHandle(hKernel32)

    if not address:
        # GetActiveProcessorCount is available only on 64 bit versions
        # of Windows from Windows 7 onward.
        # Windows Vista 64 bit and Windows XP doesn't have it.
        sysinfo = SYSTEM_INFO()
        kernel32.GetNativeSystemInfo(ctypes.byref(sysinfo))
        ncpus = sysinfo.dwNumberOfProcessors
    else:
        proc_group_count = kernel32.GetActiveProcessorGroupCount() & 0xFFFF
        for grp in range(proc_group_count):
            procs = kernel32.GetActiveProcessorCount(grp)
            ncpus = ncpus + procs

    return ncpus


def wrap_exceptions(fun):
    """Decorator which translates bare OSError and WindowsError
    exceptions into NoSuchProcess and AccessDenied.
    """

    @functools.wraps(fun)
    def wrapper(self, *args, **kwargs):
        try:
            return fun(self, *args, **kwargs)
        except OSError as err:
            if err.errno in ACCESS_DENIED_ERRSET:
                raise AccessDenied()
            if err.errno == errno.ESRCH:
                raise NoSuchProcess()
            raise

    return wrapper


def handle_from_pid(pid):
    return kernel32.OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, False, pid)


class Process(object):
    """Wrapper class around underlying C implementation."""

    __slots__ = ["pid", "_name", "_ppid"]

    def __init__(self, pid):
        self.pid = pid
        self._name = None
        self._ppid = None

    @wrap_exceptions
    def cmdline(self):
        try:
            # pass as the startupinfo keyword argument:
            out, err = subprocess.Popen(
                "wmic path win32_process get Processid,Commandline",
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.PIPE,
            ).communicate()
        except subprocess.CalledProcessError:
            pass
        elements = out.split()
        b_pid = str(self.pid).encode("ascii")
        found = False
        for pos, element in enumerate(elements):
            if element == b_pid:
                found = True
                break
        if not found:
            raise NoSuchProcess()
        return elements[pos - 1].decode("utf-8", "slashescape")

    @wrap_exceptions
    def create_time(self):
        hProcess = handle_from_pid(self.pid)

        creation_time = FILETIME()
        exit_time = ctypes.c_ulonglong()
        kernel_time = ctypes.c_ulonglong()
        user_time = ctypes.c_ulonglong()

        ret = ctypes.windll.kernel32.GetProcessTimes(
            hProcess,
            ctypes.byref(creation_time),
            ctypes.byref(exit_time),
            ctypes.byref(kernel_time),
            ctypes.byref(user_time),
        )
        kernel32.CloseHandle(hProcess)
        if not ret:
            raise NoSuchProcess()
        return HI_T * creation_time.dwHighDateTime + LO_T * creation_time.dwLowDateTime

    @wrap_exceptions
    def memory_info(self):
        t = self._get_raw_meminfo()
        rss = t[2]  # wset
        vms = t[7]  # pagefile
        return pmem(*(rss, vms) + t)

    @wrap_exceptions
    def cpu_times(self):
        creation_time = ctypes.c_ulonglong()
        exit_time = ctypes.c_ulonglong()
        kernel_time = FILETIME()
        user_time = FILETIME()
        hProcess = handle_from_pid(self.pid)
        ret = ctypes.windll.kernel32.GetProcessTimes(
            hProcess,
            ctypes.byref(creation_time),
            ctypes.byref(exit_time),
            ctypes.byref(kernel_time),
            ctypes.byref(user_time),
        )
        kernel32.CloseHandle(hProcess)
        if not ret:
            raise NoSuchProcess()
        user = HI_T * user_time.dwHighDateTime + LO_T * user_time.dwLowDateTime
        kernel = HI_T * kernel_time.dwHighDateTime + LO_T * kernel_time.dwLowDateTime
        return pcputimes(user, kernel, 0.0, 0.0)

    def _get_raw_meminfo(self):
        hProcess = handle_from_pid(self.pid)
        counters = PROCESS_MEMORY_COUNTERS_EX()
        ret = psapi.GetProcessMemoryInfo(
            hProcess, ctypes.byref(counters), ctypes.sizeof(counters)
        )
        if not ret:
            raise NoSuchProcess()
        kernel32.CloseHandle(hProcess)
        info = (
            counters.PageFaultCount,
            counters.PeakWorkingSetSize,
            counters.WorkingSetSize,
            counters.QuotaPeakPagedPoolUsage,
            counters.QuotaPagedPoolUsage,
            counters.QuotaPeakNonPagedPoolUsage,
            counters.QuotaNonPagedPoolUsage,
            counters.PagefileUsage,
            counters.PeakPagefileUsage,
        )
        return info
