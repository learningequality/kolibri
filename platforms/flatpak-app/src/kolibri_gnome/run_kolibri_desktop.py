#!/usr/bin/python3

import subprocess

from .kolibri_redirect import KolibriRedirectThread
from .utils import is_kolibri_socket_open


def kolibri_desktop_main(path=None):
    if path is None:
        path = '/'

    if is_kolibri_socket_open():
        return _run_desktop(path)
    else:
        return _run_desktop_and_service(path)


def _run_desktop(path):
    kolibri_redirect = KolibriRedirectThread()

    print("Starting Kolibri redirect...")
    kolibri_redirect.start()

    kolibri_redirect.await_started()

    kolibri_redirect_url = "http://127.0.0.1:{port}/?next={path}".format(
        port=kolibri_redirect.redirect_server_port,
        path=path
    )

    print("Opening <{}>...".format(kolibri_redirect_url))
    xdg_open_process = subprocess.run(['xdg-open', kolibri_redirect_url])

    kolibri_redirect.join()
    print("Kolibri redirect stopped.")

    return xdg_open_process.returncode


def _run_desktop_and_service(path):
    # Start our own Kolibri instances

    from .kolibri_idle_monitor import KolibriIdleMonitorThread
    from .kolibri_service import KolibriServiceThread

    kolibri_idle_monitor = KolibriIdleMonitorThread()
    kolibri_service = KolibriServiceThread(
        heartbeat_port=kolibri_idle_monitor.idle_monitor_port
    )
    kolibri_idle_monitor.set_kolibri_service(kolibri_service)

    kolibri_redirect = KolibriRedirectThread()
    
    print("Starting Kolibri idle monitor...")
    kolibri_idle_monitor.start()
    print("Starting Kolibri service...")
    kolibri_service.start()
    print("Starting Kolibri redirect...")
    kolibri_redirect.start()

    kolibri_redirect.await_started()

    kolibri_redirect_url = "http://127.0.0.1:{port}/?next={path}".format(
        port=kolibri_redirect.redirect_server_port,
        path=path
    )

    print("Opening <{}>...".format(kolibri_redirect_url))
    subprocess.run(['xdg-open', kolibri_redirect_url])

    kolibri_service.join()
    print("Kolibri service stopped.")
    kolibri_redirect.stop()
    print("Kolibri redirect stopped.")
    kolibri_idle_monitor.stop()
    print("Kolibri idle monitor stopped.")

    return kolibri_service.kolibri_exitcode
