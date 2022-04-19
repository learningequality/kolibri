import sys

from django.conf import settings
from django.core.management.base import BaseCommand
from morango.models import InstanceIDModel

import kolibri
from kolibri.core.analytics import SUPPORTED_OS
from kolibri.core.analytics.measurements import get_channels_usage_info
from kolibri.core.analytics.measurements import get_db_info
from kolibri.core.analytics.measurements import get_kolibri_process_cmd
from kolibri.core.analytics.measurements import get_kolibri_use
from kolibri.core.analytics.measurements import get_machine_info
from kolibri.core.analytics.measurements import get_requests_info
from kolibri.utils.server import installation_type
from kolibri.utils.server import NotRunning
from kolibri.utils.system import get_free_space
from kolibri.utils.time_utils import local_now


def format_line(parameter, value, indented=False):
    if indented:
        info = "  * {:30}".format("{}:".format(parameter))
    else:
        info = "* {:32}".format("{}:".format(parameter))
    return "{info}{value}".format(info=info, value=value)


class Command(BaseCommand):
    """
    This command will output information about different parameters of the server running Kolibri
    Output example:

    Sessions
    * Active sessions (guests incl): 10
    * Active users in (10 min):      6
    * Active users in (1 min):       3

    CPU
    * Total processes:               351
    * Used CPU:                      33.6%
    * Kolibri CPU usage:             22.3%

    Memory
    * Used memory:                   9.3 GB
    * Total memory:                  16.0 GB
    * Kolibri memory usage:          56.8 MB

    Channels
    * Total Channels:                2
    * Khan Academy (English)
      * Accesses:                    150
      * Time spent:                  301.22 s
    * African Storybook
      * Accesses:                     3
      * Time spent:                  18.00 s

    Requests timing
    * Homepage:                       0.03 s
    * Recommended channels:           0.01 s
    * Channels:                       0.02 s

    Device info
    * Version:                       (version)
    * OS:                            (os)
    * Installer:                     (installer)
    * Database:                      (database_path)
    * Device name:                   (device_name)
    * Free disk space:               (content_storage_free_space)
    * Server time:                   (server_time)
    * Server timezone:               (server_timezone)
    """

    help = "Outputs performance info and statistics of usage for the running Kolibri instance in this server"

    def handle(self, *args, **options):
        if not SUPPORTED_OS:
            print("This OS is not yet supported")
            sys.exit(1)

        try:
            get_kolibri_use()
        except NotRunning:
            sys.exit("Profile command executed while Kolibri server was not running")
        get_requests_info()
        self.messages = []
        self.add_header("Sessions")
        session_parameters = (
            "Active sessions (guests incl)",
            "Active users in (10 min)",
            "Active users in (1 min)",
        )
        session_info = get_db_info()
        self.add_section(session_parameters, session_info)

        self.add_header("CPU")
        kolibri_cpu, kolibri_mem = get_kolibri_use()
        used_cpu, used_memory, total_memory, total_processes = get_machine_info()
        cpu_parameters = ("Total processes", "Used CPU", "Kolibri CPU usage")
        cpu_values = (
            total_processes,
            "{} %".format(used_cpu),
            "{} %".format(kolibri_cpu),
        )
        self.add_section(cpu_parameters, cpu_values)

        self.add_header("Memory")
        memory_parameters = ("Used memory", "Total memory", "Kolibri memory usage")
        memory_values = (
            "{} Mb".format(used_memory),
            "{} Mb".format(total_memory),
            "{} Mb".format(kolibri_mem),
        )
        self.add_section(memory_parameters, memory_values)

        self.add_header("Channels")
        channels_stats = get_channels_usage_info()
        self.messages.append(format_line("Total Channels", str(len(channels_stats))))
        for channel in channels_stats:
            self.messages.append("\033[95m* {}\033[0m".format(channel.name))
            self.messages.append(format_line("Accesses", channel.accesses, True))
            self.messages.append(format_line("Time spent", channel.time_spent, True))

        self.add_header("Requests timing")
        requests_stats = get_requests_info()
        requests_parameters = ("Homepage", "Recommended channels", "Channels")
        self.add_section(requests_parameters, requests_stats)

        self.add_header("Device info")
        instance_model = InstanceIDModel.get_or_create_current_instance()[0]
        self.messages.append(format_line("Version", kolibri.__version__))
        self.messages.append(format_line("OS", instance_model.platform))
        self.messages.append(
            format_line("Installer", installation_type(get_kolibri_process_cmd()))
        )
        self.messages.append(
            format_line("Database", settings.DATABASES["default"]["NAME"])
        )
        self.messages.append(format_line("Device name", instance_model.hostname))
        self.messages.append(
            format_line(
                "Free disk space", "{} Mb".format(get_free_space() / pow(10, 6))
            )
        )
        self.messages.append(format_line("Server time", local_now()))
        self.messages.append(format_line("Server timezone", settings.TIME_ZONE))

        self.messages.append("")
        print("\n".join(self.messages))

    def add_header(self, header):
        self.messages.append("")
        self.messages.append("\033[1m{}\033[0m".format(header))

    def add_section(self, params, values):
        for index, param in enumerate(params):
            self.messages.append(format_line(param, values[index]))
