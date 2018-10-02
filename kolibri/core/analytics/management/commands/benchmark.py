import sys

from django.core.management.base import BaseCommand

from kolibri.core.analytics.measurements import get_db_info
from kolibri.core.analytics.measurements import get_kolibri_use
from kolibri.core.analytics.measurements import get_machine_info
from kolibri.core.analytics.measurements import KolibriNotRunning


def format_line(parameter, value):
    info = '* {:31}'.format('{}:'.format(parameter))
    return '{info}{value}'.format(info=info, value=value)


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
    * Free memory:                   16.0 GB
    * Kolibri memory usage:          56.8 MB

    Device info
    * Version:                       (version)
    * OS:                            (os)
    * Installer:                     (installer)
    * Server:                        (server_type)
    * Database:                      (database_path)
    * Device name:                   (device_name)
    * Free disk space:               (content_storage_free_space)
    * Server time:                   (server_time)
    * Server timezone:               (server_timezone)
    """
    help = "Outputs performance info and statistics of usage for the running Kolibri instance in this server"

    def handle(self, *args, **options):
        try:
            kolibri_cpu, kolibri_mem = get_kolibri_use()
        except KolibriNotRunning:
            sys.exit("Profile command executed while Kolibri server was not running")

        self.messages = []
        self.add_header('Sessions')
        session_parameters = ('Active sessions (guests incl)', 'Active users in (10 min)', 'Active users in (1 min)')
        session_info = get_db_info()
        self.add_section(session_parameters, session_info)

        self.add_header('CPU')
        kolibri_cpu, kolibri_mem = get_kolibri_use()
        used_cpu, used_memory, free_memory, total_processes = get_machine_info()
        cpu_parameters = ('Total processes', 'Used CPU', 'Kolibri CPU usage')
        cpu_values = (total_processes, '{} %'.format(used_cpu), '{} %'.format(kolibri_cpu))
        self.add_section(cpu_parameters, cpu_values)

        self.add_header('Memory')
        memory_parameters = ('Used memory', 'Free memory', 'Kolibri memory usage')
        memory_values = ('{} Mb'.format(used_memory), '{} Mb'.format(free_memory), '{} Kb'.format(kolibri_mem))
        self.add_section(memory_parameters, memory_values)
        self.messages.append('')
        print('\n'.join(self.messages))

    def add_header(self, header):
        self.messages.append('')
        self.messages.append(header)

    def add_section(self, params, values):
        for index, param in enumerate(params):
            self.messages.append(format_line(param, values[index]))
