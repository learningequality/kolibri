from __future__ import absolute_import

import csv
import os
import time
from datetime import datetime

from django.conf import settings
from django.core.cache import caches
from django.core.exceptions import MiddlewareNotUsed
from django.utils.deprecation import MiddlewareMixin

from kolibri.core.analytics import SUPPORTED_OS
from kolibri.utils import conf
from kolibri.utils.server import PROFILE_LOCK
from kolibri.utils.system import pid_exists

requests_profiling_file = os.path.join(
    conf.KOLIBRI_HOME,
    "performance",
    "{}_requests_performance.csv".format(time.strftime("%Y%m%d_%H%M%S")),
)

cache = caches[settings.CACHE_MIDDLEWARE_ALIAS]
try:
    import kolibri.utils.pskolibri as psutil

    kolibri_process = psutil.Process()
except NotImplementedError:
    # This middleware can't work on this OS
    kolibri_process = None


class Metrics(object):
    def __init__(self):
        """
        Save the initial values when the request comes in
        This class only will be used when MetricsMiddleware is not disabled, thus the OS is supported.
        External instances of this class must check if the OS is supported before creating new objects.
        """
        self.memory = self.get_used_memory()
        self.load = self.get_load_average()
        self.time = time.time()

    def get_used_memory(self):
        return kolibri_process.memory_info().vms

    def get_load_average(self):
        return kolibri_process.cpu_percent()

    def get_stats(self):
        """
        Calcutes time spent in processing the request
        and difference in memory and load consumed
        by kolibri while processing the request
        :returns: tuple of strings containing time consumed (in seconds),
                  Kolibri used memory (in bytes) before and after executing the request,
                  Kolibri cpu load (in %) before and after executing the request.
        """
        memory = str(self.get_used_memory())
        load = str(self.get_load_average())
        time_delta = str(time.time() - self.time)
        return (time_delta, str(self.memory), memory, str(self.load), load)


class MetricsMiddleware(MiddlewareMixin):
    """
    This Middleware will produce a requests_performance.log file, with one line per requests having this structure:
    - Timestamp
    - Request path
    - Time spent processing the request
    - Memory (in Kbytes) used by the kolibri process when the request came in
    - Memory (in Kbytes) used by the kolibri process when the response was sent
    - Percentage of use of cpu by the Kolibri process when the request came in
    - Percentage of use of cpu by the Kolibri process when the response was sent
    - One flag indicating if this request is the slowest since the analysis was started
    """

    slowest_request_time = 0
    disabled = True
    command_pid = 0

    def __init__(self, get_response=None):
        super(MetricsMiddleware, self).__init__(get_response=get_response)
        if not conf.OPTIONS["Server"]["PROFILE"]:
            raise MiddlewareNotUsed("Request profiling is not enabled")

    def process_request(self, request):
        """
        Store the start time, memory and load when the request comes in.
        """
        if not self.disabled:
            self.metrics = Metrics()

    def shutdown(self):
        """
        Disable this middleware and clean all the static variables
        """
        MetricsMiddleware.disabled = True
        MetricsMiddleware.command_pid = 0
        delattr(self, "metrics")
        if os.path.exists(PROFILE_LOCK):
            try:
                os.remove(PROFILE_LOCK)
            except OSError:
                pass  # lock file was deleted by other process

    def check_start_conditions(self):
        """
        Do the needed checks to enable the Middleware if possible
        """
        if MetricsMiddleware.disabled and conf.OPTIONS["Server"]["PROFILE"]:
            if os.path.exists(PROFILE_LOCK):
                try:
                    with open(PROFILE_LOCK, "r") as f:
                        MetricsMiddleware.command_pid = int(f.readline())
                        file_timestamp = f.readline()
                        if SUPPORTED_OS:
                            MetricsMiddleware.disabled = False
                            self.requests_profiling_file = os.path.join(
                                conf.KOLIBRI_HOME,
                                "performance",
                                "{}_requests_performance.csv".format(file_timestamp),
                            )
                            with open(
                                self.requests_profiling_file, mode="a"
                            ) as profile_file:
                                profile_writer = csv.writer(
                                    profile_file,
                                    delimiter=",",
                                    quotechar='"',
                                    quoting=csv.QUOTE_MINIMAL,
                                )
                                profile_writer.writerow(
                                    (
                                        "Date",
                                        "Path",
                                        "Duration",
                                        "Memory before (Kb)",
                                        "Memory after (Kb)",
                                        "Load before (%)",
                                        "Load after(%)",
                                        "Longest time up to now",
                                    )
                                )
                except (IOError, TypeError, ValueError):
                    # Kolibri command PID file has been deleted or it's corrupted
                    try:
                        os.remove(PROFILE_LOCK)
                    except OSError:
                        pass  # lock file was deleted by other process

    def process_response(self, request, response):
        """
        Calculate and output the page generation details
        Log output consist on:
        Datetime, request path, request duration, memory before, memory after requests is finished,
        cpu load before, cpu load after the request is finished, max
        Being `max` True or False to indicate if this is the slowest request since logging began.
        """
        self.check_start_conditions()

        if not MetricsMiddleware.disabled and hasattr(self, "metrics"):
            path = request.get_full_path()
            (
                duration,
                memory_before,
                memory,
                load_before,
                load,
            ) = self.metrics.get_stats()
            max_time = False
            if float(duration) > MetricsMiddleware.slowest_request_time:
                MetricsMiddleware.slowest_request_time = float(duration)
                max_time = True
            timestamp = datetime.now().strftime("%Y/%m/%d %H:%M:%S.%f")
            collected_information = (
                timestamp,
                path,
                duration,
                memory_before,
                memory,
                load_before,
                load,
                str(max_time),
            )
            with open(self.requests_profiling_file, mode="a") as profile_file:
                profile_writer = csv.writer(
                    profile_file,
                    delimiter=",",
                    quotechar='"',
                    quoting=csv.QUOTE_MINIMAL,
                )
                profile_writer.writerow(collected_information)
            if not pid_exists(MetricsMiddleware.command_pid) or not os.path.exists(
                PROFILE_LOCK
            ):
                self.shutdown()
        return response
