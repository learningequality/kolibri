import csv
import os.path
import sys
import time
from datetime import datetime
from os import getpid

from django.core.management.base import BaseCommand

from kolibri.core.analytics import SUPPORTED_OS
from kolibri.core.analytics.measurements import get_db_info
from kolibri.core.analytics.measurements import get_kolibri_use
from kolibri.core.analytics.measurements import get_machine_info
from kolibri.utils import conf
from kolibri.utils.server import NotRunning
from kolibri.utils.server import PROFILE_LOCK
from kolibri.utils.system import pid_exists


def remove_lock():
    # Kolibri command PID file exists but no command is running, it's corrupted
    try:
        os.remove(PROFILE_LOCK)
    except OSError:
        pass  # lock file was deleted by other process


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
    - Memory (In Mbytes) used by the kolibri process (just RAM, not swap memory included)
    """

    help = "Logs performance/profiling info in the server running Kolibri"

    def add_arguments(self, parser):
        parser.add_argument(
            "--num-samples",
            action="store",
            dest="num_samples",
            default=60,
            type=int,
            help="Specifies the number of times the profile will take measures before ending",
        )

    def check_start_conditions(self):
        if not SUPPORTED_OS:
            print("This OS is not yet supported")
            sys.exit(1)

        if not conf.OPTIONS["Server"]["PROFILE"]:
            print(
                "Kolibri has not enabled profiling of its requests."
                "To enable it, edit the Kolibri options.ini file and "
                "add `PROFILE = true` in the [Server] section"
            )

        if os.path.exists(PROFILE_LOCK):
            command_pid = None
            try:
                with open(PROFILE_LOCK, "r") as f:
                    command_pid = int(f.readline())
            except (IOError, TypeError, ValueError):
                remove_lock()
            if command_pid:
                if pid_exists(command_pid):
                    print("Profile command is already running")
                    sys.exit(1)
                else:
                    remove_lock()

    def handle(self, *args, **options):
        self.check_start_conditions()
        interval = 10  # the measures are taken every 10 seconds

        this_pid = getpid()
        file_timestamp = time.strftime("%Y%m%d_%H%M%S")
        try:
            with open(PROFILE_LOCK, "w") as f:
                f.write("%d" % this_pid)
                f.write("\n{}".format(file_timestamp))
        except (IOError, OSError):
            print(
                "Impossible to create profile lock file. Kolibri won't profile its requests"
            )
        samples = 1
        num_samples = options["num_samples"]
        performance_dir = os.path.join(conf.KOLIBRI_HOME, "performance")
        self.performance_file = os.path.join(
            performance_dir, "{}_performance.csv".format(file_timestamp)
        )
        if not os.path.exists(performance_dir):
            try:
                os.mkdir(performance_dir)
            except OSError:
                print("Not enough permissions to write performance logs")
                sys.exit(1)
        with open(self.performance_file, mode="w") as profile_file:
            profile_writer = csv.writer(
                profile_file, delimiter=",", quotechar='"', quoting=csv.QUOTE_MINIMAL
            )
            profile_writer.writerow(
                (
                    "Date",
                    "Active sessions",
                    "Active users",
                    "Users last minute",
                    "Server CPU %",
                    "Server used memory (Mb)",
                    "Server memory (Mb)",
                    "Processes",
                    "Kolibri CPU % use ",
                    "Kolibri Memory (Mb)",
                )
            )

        while samples <= num_samples:
            message = self.get_logs()
            with open(self.performance_file, mode="a") as profile_file:
                profile_writer = csv.writer(
                    profile_file,
                    delimiter=",",
                    quotechar='"',
                    quoting=csv.QUOTE_MINIMAL,
                )
                profile_writer.writerow(message)
            samples += 1
            time.sleep(interval)

    def get_logs(self):
        """
        Collect all the information to return one log line
        """
        try:
            kolibri_cpu, kolibri_mem = get_kolibri_use()
        except NotRunning:
            sys.exit("Profile command executed while Kolibri server was not running")

        active_sessions, active_users, active_users_minute = get_db_info()
        used_cpu, used_memory, total_memory, total_processes = get_machine_info()
        timestamp = datetime.now().strftime("%Y/%m/%d %H:%M:%S.%f")
        collected_information = (
            timestamp,
            active_sessions,
            active_users,
            active_users_minute,
            used_cpu,
            used_memory,
            total_memory,
            total_processes,
            kolibri_cpu,
            kolibri_mem,
        )

        return collected_information
