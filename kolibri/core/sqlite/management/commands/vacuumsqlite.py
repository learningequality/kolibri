import logging as logger
import time

from django.core.management.base import BaseCommand
from django.db import connections
from django.db import DEFAULT_DB_ALIAS

logging = logger.getLogger(__name__)


class Command(BaseCommand):
    help = "Vacuum Kolibri's SQLite database to optimize it and reduce the .wal file size"

    def add_arguments(self, parser):
        parser.add_argument(
            '--database', action='store', dest='database', default=DEFAULT_DB_ALIAS,
            help='Specifies the database to vacuum. Defaults to the "default" database.',
        )
        parser.add_argument(
            '--interval', action='store', dest='interval', default=0, type=int,
            help='Specifies the interval (in minutes) to run the process continuosly. If 0, no repetition will happen',
        )

    def handle(self, *args, **options):
        database = options['database']
        connection = connections[database]
        interval = options['interval']
        if connection.vendor == "sqlite":
            while True:
                self.perform_vacuum(connection)
                if not interval:
                    break
                logging.info("Next Vacuum in {interval} minutes.".format(interval=interval))
                time.sleep(interval * 60)

    def perform_vacuum(self, connection):
        try:
            cursor = connection.cursor()
            cursor.execute('VACUUM;')
            connection.close()
        except Exception as e:
            new_msg = (
                "Vacuum of database {db_name} couldn't be executed. Possible reasons:\n"
                "  * There is an open transaction in the db.\n"
                "  * There are one or more active SQL statements.\n"
                "The full error: {error_msg}").format(db_name=connection.settings_dict['NAME'], error_msg=e)
            logging.error(new_msg)
        else:
            logging.info("Sqlite database Vacuum finished.")
