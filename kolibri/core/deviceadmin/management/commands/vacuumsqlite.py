import logging

from django.core.management.base import BaseCommand
from django.db import DEFAULT_DB_ALIAS

from kolibri.core.deviceadmin.utils import perform_vacuum

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Vacuum Kolibri's SQLite database to optimize it and reduce the .wal file size"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--database",
            action="store",
            dest="database",
            default=DEFAULT_DB_ALIAS,
            help='Specifies the database to vacuum. Defaults to the "default" database.',
        )

    def handle(self, *args, **options):
        database = options["database"]
        perform_vacuum(database)
