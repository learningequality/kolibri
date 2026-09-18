from kolibri.core.auth.utils.bulk_export import bulk_export_users
from kolibri.core.tasks.management.commands.base import AsyncCommand


class Command(AsyncCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "-O",
            "--output-file",
            action="store",
            dest="output_file",
            default=None,
            type=str,
            help="The generated file will be saved with this name in the current directory",
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
            "-w",
            "--overwrite",
            action="store_true",
            dest="overwrite",
            default=True,
            help="Allows overwritten of the exported file in case it exists",
        )
        parser.add_argument(
            "--locale",
            action="store",
            type=str,
            default=None,
            help="Code of the language for the headers to be translated",
        )

    def handle_async(self, *args, **options):
        bulk_export_users(
            facility_id=options["facility"],
            locale=options["locale"],
            use_storage=options["use_storage"],
            output_file=options["output_file"],
            overwrite=options["overwrite"],
        )
