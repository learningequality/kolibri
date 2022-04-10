import time
from collections import namedtuple
from datetime import timedelta

import requests
from django.contrib.sessions.models import Session
from django.db import connection
from django.db.models import Count
from django.db.models import Sum
from django.db.utils import OperationalError
from django.utils import timezone

from kolibri.core.analytics import SUPPORTED_OS
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import UserSessionLog
from kolibri.utils.server import NotRunning
from kolibri.utils.server import PID_FILE

try:
    import kolibri.utils.pskolibri as psutil
except NotImplementedError:
    # This module can't work on this OS
    psutil = None


def get_db_info():
    """
    Returns information about the sessions and users the current
    Kolibri server has in use

    """
    # Users information
    active_sessions = "unknown"
    active_users = active_users_minute = None
    try:
        connection.ensure_connection()
        # Sessions active in the last 10 minutes (includes guest accesses):
        active_sessions = str(
            Session.objects.filter(expire_date__gte=timezone.now()).count()
        )
        last_ten_minutes = timezone.now() - timedelta(minutes=10)
        last_minute = timezone.now() - timedelta(minutes=1)
        # Active logged users:
        active_users = str(
            UserSessionLog.objects.filter(
                last_interaction_timestamp__gte=last_ten_minutes
            ).count()
        )
        # Logged users with activity in the last minute:
        active_users_minute = str(
            UserSessionLog.objects.filter(
                last_interaction_timestamp__gte=last_minute
            ).count()
        )
    except OperationalError:
        print("Database unavailable, impossible to retrieve users and sessions info")

    return (active_sessions, active_users, active_users_minute)


def get_channels_usage_info():
    """
    Scan the channels Kolibri has installed, getting information on how many times
    their resources have been accessed and how long they have been used
    :returns: List containing namedtuples, with each channel: id, name, accesses and time spent
    """
    channels_info = []
    ChannelsInfo = namedtuple("ChannelsInfo", "id name accesses time_spent")

    try:
        connection.ensure_connection()
        channels = ChannelMetadata.objects.values("id", "name")
        channel_stats = ContentSessionLog.objects.values("channel_id").annotate(
            time_spent=Sum("time_spent"), total=Count("channel_id")
        )
        for channel in channels:
            stats = channel_stats.filter(channel_id=channel["id"])
            if stats:
                channels_info.append(
                    ChannelsInfo(
                        id=channel["id"],
                        name=channel["name"],
                        accesses=str(stats[0]["total"]),
                        time_spent="{:.2f} s".format(stats[0]["time_spent"]),
                    )
                )
            else:
                channels_info.append(
                    ChannelsInfo(
                        id=channel["id"],
                        name=channel["name"],
                        accesses="0",
                        time_spent="0.00 s",
                    )
                )
    except OperationalError:
        print("Database unavailable, impossible to retrieve channels usage info")
    return channels_info


def get_requests_info():
    """
    Returns timing information on some Kolibri pages that can be hit without credentials
    :returns: tuple of strings containing time in seconds when requesting
              - Kolibri homepage
              - Kolibri recommended channels
              - Kolibri channels list
    """

    def format_url(url, base_url):
        formatted = "{base_url}{url}&contentCacheKey={cache}".format(
            base_url=base_url, url=url, cache=time.time()
        )
        return formatted

    _, port = get_kolibri_process_info()
    if port:
        base_url = "http://localhost:{}".format(port)
        homepage_time = "{:.2f} s".format(
            requests.get(base_url).elapsed.total_seconds()
        )
        recommended_url = format_url(
            "/api/content/contentnode_slim/popular/?include_coach_content=false",
            base_url,
        )
        recommended_time = "{:.2f} s".format(
            requests.get(recommended_url).elapsed.total_seconds()
        )
        channels_url = format_url("/api/content/channel/?available=true", base_url)
        channels_time = "{:.2f} s".format(
            requests.get(channels_url).elapsed.total_seconds()
        )
    else:
        homepage_time = recommended_time = channels_time = None

    return (homepage_time, recommended_time, channels_time)


def get_machine_info():
    """
    Gets information on the memory, cpu and processes in the server
    :returns: tuple of strings containing cpu percentage, used memory, free memory and number of active processes
    """
    if not SUPPORTED_OS:
        return (None, None, None, None)
    used_cpu = str(psutil.cpu_percent())
    used_memory = str(psutil.virtual_memory().used / pow(10, 6))  # In Megabytes
    total_memory = str(psutil.virtual_memory().total / pow(10, 6))  # In Megabytes
    total_processes = str(len(psutil.pids()))

    return (used_cpu, used_memory, total_memory, total_processes)


def get_kolibri_process_info():
    """
    Return information on the Kolibri process running in the machine
    :returns: tuple of integers containing PID and TCP Port of
              the running (if any) Kolibri server in this same machine
    """
    kolibri_pid = None
    kolibri_port = None
    try:
        with open(PID_FILE, "r") as f:
            kolibri_pid = int(f.readline())
            kolibri_port = int(f.readline())
    except IOError:
        pass  # Kolibri PID file does not exist
    except ValueError:
        pass  # corrupted Kolibri PID file
    return (kolibri_pid, kolibri_port)


def get_kolibri_process_cmd():
    """
    Retrieve from the OS the command line executed to run Kolibri server
    :returns: tuple with command line and its arguments
    """
    if not SUPPORTED_OS:
        return None
    kolibri_pid, _ = get_kolibri_process_info()
    try:
        kolibri_proc = psutil.Process(kolibri_pid)
    except psutil.NoSuchProcess:
        # Kolibri server is not running
        raise NotRunning(0)
    return kolibri_proc.cmdline()


def get_kolibri_use(development=False):
    """
    Gets information on the memory and cpu usage of the current Kolibri process
    :returns: tuple of strings containing cpu percentage and virtual memory used (in Mb)
    """
    if not SUPPORTED_OS:
        return (None, None)
    kolibri_mem = kolibri_cpu = "None"
    kolibri_pid, _ = get_kolibri_process_info()

    if kolibri_pid:
        try:
            kolibri_proc = psutil.Process(kolibri_pid)
            kolibri_mem = str(kolibri_proc.memory_info().rss / pow(10, 6))
            kolibri_cpu = str(kolibri_proc.cpu_percent())
        except psutil.NoSuchProcess:
            # Kolibri server is not running
            raise NotRunning(0)

    return (kolibri_cpu, kolibri_mem)
