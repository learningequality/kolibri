from kolibri.core.auth.utils.delete_facility import delete_facility
from kolibri.core.tasks.management.commands.base import AsyncCommand


class Command(AsyncCommand):
    help = "This command initiates the deletion process for a facility and all of its related data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--facility",
            action="store",
            type=str,
            help="The ID of the facility to delete",
        )
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Enforce that deletion count matches expected count",
        )
        parser.add_argument("--noninteractive", action="store_true")

    def handle_async(self, *args, **options):
        delete_facility(
            facility_id=options["facility"],
            noninteractive=options["noninteractive"],
            strict=options["strict"],
        )
