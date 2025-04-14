from django.core.management.base import BaseCommand
from django.core.management.base import CommandError


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("filepath", action="store", help="Path to CSV file.")
        parser.add_argument(
            "--facility",
            action="store",
            type=str,
            help="Facility id to import the users into",
        )

    def handle(self):
        raise CommandError(
            "importusers command has been removed. Please use the bulkimportusers command. \
            You may need to update your spreadsheet. \
            https://kolibri.readthedocs.io/en/latest/manage/command_line.html#import-from-csv"
        )
