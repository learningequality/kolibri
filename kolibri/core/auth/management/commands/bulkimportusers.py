from kolibri.core.auth.utils.bulk_import import bulk_import_users
from kolibri.core.tasks.management.commands.base import AsyncCommand


class Command(AsyncCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "filepath", action="store", type=str, help="Path to CSV file."
        )
        parser.add_argument(
            "-s",
            "--use-django-storage",
            action="store_true",
            dest="use_storage",
            default=False,
            help="The generated file will be read/written using Django FileStorage",
        )
        parser.add_argument(
            "--facility",
            action="store",
            type=str,
            help="Facility id to import the users into",
        )
        parser.add_argument(
            "--dryrun",
            action="store_true",
            help="Validate data without doing actual database updates",
        )
        parser.add_argument(
            "--delete",
            action="store_true",
            help="Delete all users in the facility not included in this import (excepting actual user)",
        )

        parser.add_argument(
            "--userid",
            action="store",
            type=str,
            default=None,
            help="Id of the user executing the command, it will not be deleted in case deleted is set",
        )

        parser.add_argument(
            "--locale",
            action="store",
            type=str,
            default=None,
            help="Code of the language for the messages to be translated",
        )
        parser.add_argument(
            "--errorlines",
            action="store",
            type=str,
            default=None,
            help="File to store errors output (to be used in internal tests only)",
        )

    def handle_async(self, *args, **options):
        bulk_import_users(
            filepath=options["filepath"],
            facility=options.get("facility"),
            userid=options.get("userid"),
            locale=options.get("locale"),
            dryrun=options["dryrun"],
            delete=options["delete"],
            use_storage=options["use_storage"],
            errorlines=options.get("errorlines"),
        )
