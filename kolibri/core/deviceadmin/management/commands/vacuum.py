import logging

from django.core.management.base import BaseCommand
from django.db import DEFAULT_DB_ALIAS

from kolibri.core.deviceadmin.utils import perform_vacuum

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Vacuum Kolibri's database. For Postgresql databases it vacuums only Morango tables, for SQLite databases, it optimizes it and reduces the .wal file size"  # noqa

    def add_arguments(self, parser):
        parser.add_argument(
            "--database",
            action="store",
            dest="database",
            default=DEFAULT_DB_ALIAS,
            help='Specifies the database to vacuum. Defaults to the "default" database.',
        )
        parser.add_argument(
            "--full",
            type=bool,
            dest="full",
            default=False,
            help="If set, in a Postgresql database a full vacuum will be done on the morango_recordmaxcounterbuffer and morango_buffer tables",
        )

    def handle(self, *args, **options):
        database = options["database"]
        perform_vacuum(database, options["full"])
