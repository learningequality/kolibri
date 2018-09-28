import logging
import sys
import time
from datetime import timedelta

import psutil
from django.contrib.sessions.models import Session
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.utils import OperationalError
from django.utils import timezone
try:
    import urllib.request as urlrequest
except ImportError:
    import urllib as urlrequest

from kolibri.core.logger.models import UserSessionLog
from kolibri.utils.server import PID_FILE

logger = logging.getLogger('profiler')

def get_db_info():
    # Users information
    active_sessions = 'unknown'
    try:
        connection.ensure_connection()
        # Sessions active in the last 10 minutes (includes guest accesses):
        active_sessions = str(Session.objects.filter(expire_date__gte=timezone.now()).count())
        last_ten_minutes = timezone.now() - timedelta(minutes=10)
        last_minute = timezone.now() - timedelta(minutes=1)
        # Active logged users:
        active_users = str(UserSessionLog.objects.filter(last_interaction_timestamp__gte=last_ten_minutes).count())
        # Logged users with activity in the last minute:
        active_users_minute = str(UserSessionLog.objects.filter(last_interaction_timestamp__gte=last_minute).count())
    except OperationalError:
        logger.error('Database unavailable, impossible to retrieve users and sessions info')

    return (active_sessions, active_users, active_users_minute)

def get_machine_info():
    """
    Gets information on the memory, cpu and processes in the server
    :returns: tuple of strings containing cpu percentage, used memory, free memory and number of active processes
    """
    used_cpu = str(psutil.cpu_percent())
    used_memory = str(psutil.virtual_memory().used / pow(2, 10))  # In Kilobytes
    free_memory = str(psutil.virtual_memory().available / pow(2, 10))  # In Kilobytes
    total_processes = str(len(psutil.pids()))

    return (used_cpu, used_memory, free_memory, total_processes)

def get_kolibri_process_info():
    kolibri_pid = None
    kolibri_port = None
    try:
        with open(PID_FILE, 'r') as f:
            kolibri_pid = int(f.readline())
            kolibri_port = int(f.readline())
    except IOError:
        pass  # Kolibri PID file does not exist
    except ValueError:
        pass  # corrupted Kolibri PID file
    return (kolibri_pid, kolibri_port)

def get_kolibri_use(development=False):
    """
    Gets information on the memory and cpu usage of the current Kolibri process
    :returns: tuple of strings containing cpu percentage and virtual memory used
    """
    kolibri_mem = kolibri_cpu = 'None'
    kolibri_pid, _ = get_kolibri_process_info()

    if kolibri_pid:
        try:
            kolibri_proc = psutil.Process(kolibri_pid)
            kolibri_mem = str(kolibri_proc.memory_info().vms / pow(2, 10))
            kolibri_cpu = str(kolibri_proc.cpu_percent())
        except psutil.NoSuchProcess:
            # Kolibri server is not running
            sys.exit("Profile command executed while Kolibri server was not running")

    return (kolibri_cpu, kolibri_mem)

class Command(BaseCommand):
    """
    This command will produce a performance.log file with this structure in every line:
    - Timestamp
    - Number of Kolibri active sessions
    - Number of Kolibri active users
    - Number of Kolibri active users that have interacted in the last minute
    - Percentage of use of the cpu of the server
    - Used memory (In Kbytes) in the server
    - Number of processes in the server
    - Percentage of use of cpu by the Kolibri process
    - Memory (In Kbytes) used by the kolibri process
    """
    help = "Logs performance/profiling info in the server running Kolibri"

    def add_arguments(self, parser):
        parser.add_argument(
            '--num-samples', action='store', dest='num_samples', default=60, type=int,
            help='Specifies the number of times the profile will take measures before ending'
        )

    def handle(self, *args, **options):
        interval = 10  # the measures are taken every 10 seconds
        _, port = get_kolibri_process_info()
        if port:
            this_command = psutil.Process()
            try:
                urlrequest.urlopen('http://localhost:{port}/api/analytics/activate/{pid}/'.
                                   format(port=port, pid=this_command.pid))
            except IOError:
                logger.info("Impossible to connect to a Kolibri server in the current machine")
        samples = 1
        num_samples = options['num_samples']
        while samples <= num_samples:
            message = self.get_logs()
            logger.info(message)
            samples += 1
            time.sleep(interval)

    def get_logs(self):
        """
        Collect all the information to return one log line
        """
        kolibri_cpu, kolibri_mem = get_kolibri_use()
        active_sessions, active_users, active_users_minute = get_db_info()
        used_cpu, used_memory, free_memory, total_processes = get_machine_info()
        collected_information = (active_sessions, active_users, active_users_minute, used_cpu,
                                 used_memory, free_memory, total_processes, kolibri_cpu, kolibri_mem)

        return ','.join(collected_information)
