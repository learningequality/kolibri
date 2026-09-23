from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from morango.models import Certificate

from kolibri.core import error_constants
from kolibri.core.auth.management.utils import confirm_or_exit
from kolibri.core.auth.management.utils import get_facility
from kolibri.core.discovery.utils.network.errors import NetworkClientError
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.utils.portal import registerfacility


class Command(BaseCommand):
    help = "Allows registering of facilities that have been synced to a portal server."

    def add_arguments(self, parser):
        parser.add_argument("token", action="store", type=str, help="Token of project")
        parser.add_argument(
            "--facility", action="store", type=str, help="ID of facility to register"
        )
        parser.add_argument("--noninteractive", action="store_true")

    def _register(self, token, facility):
        registerfacility(token, facility)
        self.stdout.write(
            f"Facility: {facility.name} has been successfully registered."
        )

    def handle(self, *args, **options):
        facility_id = options["facility"]
        noninteractive = options["noninteractive"]
        token = options["token"]

        facility = get_facility(facility_id, noninteractive)
        # register the facility
        try:
            self._register(token, facility)
        except Certificate.DoesNotExist as e:
            raise CommandError(
                f"This device does not own a certificate for Facility: {facility.name}"
            ) from e
        # an invalid nonce/register response
        except NetworkLocationResponseFailure as e:
            error = e.response.json()[0]
            message = error["metadata"].get("message") or e.response.text
            # handle facility not existing response from portal server
            if error["id"] == error_constants.FACILITY_DOES_NOT_EXIST:
                # if the facility does not exist on data portal, try syncing and retry registering
                if not noninteractive:
                    confirm_or_exit(
                        f"Facility: {facility.name} does not exist on data portal server. Would you like to initiate a syncing session?"
                    )
                    call_command(
                        "sync", facility=facility_id, noninteractive=noninteractive
                    )
                    confirm_or_exit(
                        f"Facility: {facility.name} has been synced. Would you like to retry registering?"
                    )
                    return self._register(token, facility)

            # display nice error messages for other Http errors
            raise CommandError(
                f"{e.response.status_code} Client Error: For url: {e.response.url} Reason: {message}"
            ) from e
        # handle any other invalid response
        except NetworkClientError as e:
            raise CommandError(e) from e
