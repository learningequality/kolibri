#!/usr/bin/python3

from .kolibri_idle_monitor import KolibriIdleMonitorThread
from .kolibri_service import KolibriServiceThread


def kolibri_service_main():
    kolibri_idle_monitor = KolibriIdleMonitorThread()
    kolibri_service = KolibriServiceThread(
        heartbeat_port=kolibri_idle_monitor.idle_monitor_port
    )
    kolibri_idle_monitor.set_kolibri_service(kolibri_service)

    kolibri_idle_monitor.start()
    kolibri_service.start()

    kolibri_service.join()
    kolibri_idle_monitor.stop()

    return kolibri_service.kolibri_exitcode
