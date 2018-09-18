import logging
import time
from datetime import timedelta

import psutil
from django.contrib.sessions.models import Session
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.utils import OperationalError
from django.utils import timezone

from kolibri.core.logger.models import UserSessionLog

logger = logging.getLogger('profiler')


class Command(BaseCommand):
    help = "Logs performance/profiling info in the server running Kolibri"

    def add_arguments(self, parser):
        parser.add_argument(
            '--interval', action='store', dest='interval', default=0, type=int,
            help='Specifies the interval (in seconds) to run the process continuosly. If 0, no repetition will happen',
        )

    def handle(self, *args, **options):
        interval = options['interval']
        while True:
            message = self.get_logs()
            logger.info(message)
            if not interval:
                break
            time.sleep(interval)

    def get_logs(self):
        logs = ''

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

        # Machine usage information
        used_cpu = str(psutil.cpu_percent())
        used_memory = str(psutil.virtual_memory().used / pow(2, 20))  # In Megabytes
        free_memory = str(psutil.virtual_memory().available / pow(2, 20))  # In Megabytes
        total_processes = str(len(psutil.pids()))

        # Kolibri usage information
        kolibri_pid = None
        current_command_pid = psutil.Process().pid
        for proc in psutil.process_iter():
            if proc.pid == current_command_pid:
                continue  # don't catch this kolibri command as the kolibri server process
            process_name = proc.name().lower()
            if process_name in ('kolibri', '/usr/bin/kolibri', '/usr/local/bin/kolibri') or process_name.startswith('kolibri'):
                kolibri_pid = proc.pid
                break
        if kolibri_pid:
            kolibri_proc = psutil.Process(kolibri_pid)
            kolibri_mem = str(kolibri_proc.memory_info().vms / pow(2, 20))
            kolibri_cpu = str(kolibri_proc.cpu_percent())
        else:
            kolibri_mem = kolibri_cpu = 'None'

        collected_information = (active_sessions, active_users, active_users_minute, used_cpu, used_memory, free_memory, total_processes, kolibri_cpu, kolibri_mem)
        logs = ','.join(collected_information)
        return logs
