import logging
import sys
import time

from django.core.management.base import BaseCommand

from kolibri.core.analytics.measurements import get_db_info
from kolibri.core.analytics.measurements import get_kolibri_process_info
from kolibri.core.analytics.measurements import get_kolibri_use
from kolibri.core.analytics.measurements import get_machine_info
from kolibri.core.analytics.measurements import get_process_pid
from kolibri.core.analytics.measurements import KolibriNotRunning

try:
    import urllib.request as urlrequest
except ImportError:
    import urllib as urlrequest


logger = logging.getLogger('profiler')
LINUX = sys.platform.startswith("linux")

class Command(BaseCommand):
    """
    This command will produce a performance.log file with this structure in every line:
    - Timestamp
    - Number of Kolibri active sessions
    - Number of Kolibri active users
    - Number of Kolibri active users that have interacted in the last minute
    - Percentage of use of the cpu of the server
    - Used memory (In Mbytes) in the server
    - Total memory (In Mbytes) in the server
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
        if not LINUX:
            print("This OS is not supported yet")
            sys.exit(0)

        interval = 10  # the measures are taken every 10 seconds
        _, port = get_kolibri_process_info()
        if port:
            this_pid = get_process_pid()
            try:
                urlrequest.urlopen('http://localhost:{port}/api/analytics/activate/{pid}/'.
                                   format(port=port, pid=this_pid))
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
        try:
            kolibri_cpu, kolibri_mem = get_kolibri_use()
        except KolibriNotRunning:
            sys.exit("Profile command executed while Kolibri server was not running")

        active_sessions, active_users, active_users_minute = get_db_info()
        used_cpu, used_memory, total_memory, total_processes = get_machine_info()
        collected_information = (active_sessions, active_users, active_users_minute, used_cpu,
                                 used_memory, total_memory, total_processes, kolibri_cpu, kolibri_mem)

        return ','.join(collected_information)
