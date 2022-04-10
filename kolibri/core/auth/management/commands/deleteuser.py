from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

from kolibri.core.auth.management.utils import confirm_or_exit
from kolibri.core.auth.models import FacilityUser


class Command(BaseCommand):
    help = "To allow administrators to comply with GDPR requests, this command initiates the deletion process for a user."

    def add_arguments(self, parser):
        parser.add_argument(
            "username", action="store", type=str, help="Username of user to delete"
        )
        parser.add_argument(
            "--facility",
            action="store",
            type=str,
            help="Facility ID that user is associated with",
        )

    def handle(self, *args, **options):
        try:
            if options["facility"]:
                user = FacilityUser.objects.get(
                    username=options["username"], facility_id=options["facility"]
                )
            else:
                user = FacilityUser.objects.get(username=options["username"])
        except FacilityUser.DoesNotExist:
            raise CommandError(
                "User with username `{username}` does not exist.".format(
                    username=options["username"]
                )
            )
        except FacilityUser.MultipleObjectsReturned:
            raise CommandError(
                (
                    "There is more than one user on this device with the username `{username}`. "
                    "Please specify the facility ID for this user.".format(
                        username=options["username"]
                    )
                )
            )

        # ensure the user REALLY wants to do this!
        confirm_or_exit(
            "Are you sure you wish to permanently delete this user? This will DELETE ALL DATA FOR THIS USER."
        )
        confirm_or_exit(
            "ARE YOU SURE? If you do this, there is no way to recover the user data on this device."
        )

        print(
            "Proceeding with user deletion. Deleting all data for user <{}>".format(
                options["username"]
            )
        )
        user.delete(hard_delete=True)
        print("Deletion complete. All data for this user has been deleted.")
