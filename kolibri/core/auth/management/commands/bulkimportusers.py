import os
from contextlib import ExitStack

from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

from kolibri.core.auth.errors import BulkUserImportError
from kolibri.core.auth.utils.bulk_import import BulkUserImportManager


class Command(BaseCommand):
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

    def handle(self, *args, **options):
        try:
            output = options["errorlines"]
            with ExitStack() as stack:
                errorlines = output
                if isinstance(output, str):
                    input_path = options["filepath"]
                    if options["use_storage"]:
                        try:
                            input_path = default_storage.path(input_path)
                        except NotImplementedError:
                            input_path = None
                    if (
                        input_path is not None
                        and os.path.exists(output)
                        and os.path.samefile(input_path, output)
                    ):
                        raise CommandError(
                            "The error output must differ from the input file."
                        )
                    errorlines = stack.enter_context(
                        open(output, "w", encoding="utf-8")
                    )
                BulkUserImportManager(
                    options["filepath"],
                    facility_id=options["facility"],
                    userid=options["userid"],
                    locale=options["locale"],
                    dryrun=options["dryrun"],
                    delete=options["delete"],
                    use_storage=options["use_storage"],
                    errorlines=errorlines,
                ).run()
        except (BulkUserImportError, OSError) as e:
            raise CommandError(str(e)) from e
