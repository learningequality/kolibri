from __future__ import absolute_import

import logging
import time

import psutil
from django.conf import settings
from django.core.cache import caches
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('requests_profiler')
cache = caches[settings.CACHE_MIDDLEWARE_ALIAS]
kolibri_process = psutil.Process()


class Metrics(object):
    def __init__(self):
        """
        Save the initial values when the request comes in
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
        :returns: tuple of strings containing difference in memory (in bytes),
                  difference in cpu load (in %) and time consumed (in seconds)
        """
        memory_delta = str(self.get_used_memory() - self.memory)
        load_delta = str(self.get_load_average() - self.load)
        time_delta = str(time.time() - self.time)
        return (memory_delta, load_delta, time_delta)


class MetricsMiddleware(MiddlewareMixin):

    slowest_request = 'unknown'
    slowest_request_time = 0
    disabled = True
    command_pid = 0

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
        delattr(self, 'metrics')

    def process_response(self, request, response):
        """
        Calculate and output the page generation details
        Log output consist on:
        Datetime, request path, request duration, memory diff, memory load diff, max
        Being `max` True or False to indicate if this is the slowest request since logging began.
        """
        if not MetricsMiddleware.disabled and hasattr(self, 'metrics'):
            path = request.get_full_path()
            memory, load, duration = self.metrics.get_stats()
            max_time = False
            if duration > MetricsMiddleware.slowest_request_time:
                MetricsMiddleware.slowest_request = path
                MetricsMiddleware.slowest_request_time = duration
                max_time = True
            collected_information = (path, duration, memory, load, str(max_time))
            logger.info(','.join(collected_information))
            if not psutil.pid_exists(MetricsMiddleware.command_pid):
                self.shutdown()
        return response
