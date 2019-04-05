import datetime
import logging
import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections
from django.db import connections
from django.db import DEFAULT_DB_ALIAS

from kolibri.utils.server import vacuum_db_lock

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Vacuum Kolibri's SQLite database to optimize it and reduce the .wal file size"

    def add_arguments(self, parser):
        parser.add_argument(
            '--database', action='store', dest='database', default=DEFAULT_DB_ALIAS,
            help='Specifies the database to vacuum. Defaults to the "default" database.',
        )
        parser.add_argument(
            '--scheduled', action='store', dest='scheduled', default=False, type=bool,
            help='Flag to specify whether to run the process continuosly (currently set every day at 3AM). If False, no repetition will happen',
        )

    def handle(self, *args, **options):
        database = options['database']
        connection = connections[database]
        scheduled = options['scheduled']
        if connection.vendor == "sqlite":
            while True:
                with vacuum_db_lock:
                    self.perform_vacuum(database)
                if not scheduled:
                    break
                current_dt = datetime.datetime.now()
                _3AM = datetime.time(hour=3)
                # calculate how many minutes until 3AM
                if current_dt.time() < _3AM:
                    calculated_time = current_dt.combine(current_dt.date(), _3AM)
                    diff = calculated_time - current_dt
                    interval = diff.seconds / 60  # minutes
                else:  # calculate how many minutes until 3AM the next day
                    calculated_time = current_dt.combine(current_dt.date(), _3AM) + datetime.timedelta(days=1)
                    diff = calculated_time - current_dt
                    interval = diff.seconds / 60  # minutes
                logger.info("Next Vacuum at 3AM local server time (in {} minutes).".format(interval))
                time.sleep(interval * 60)

    def perform_vacuum(self, database):
        try:
            close_old_connections()
            connections.close_all()
            connection = connections[database]
            cursor = connection.cursor()
            cursor.execute('vacuum;')
            connection.close()
        except Exception as e:
            logger.error(e)
            new_msg = (
                "Vacuum of database {db_name} couldn't be executed. Possible reasons:\n"
                "  * There is an open transaction in the db.\n"
                "  * There are one or more active SQL statements.\n"
                "The full error: {error_msg}").format(db_name=connections[database].settings_dict['NAME'], error_msg=e)
            logger.error(new_msg)
        else:
            logger.info("Sqlite database Vacuum finished.")
