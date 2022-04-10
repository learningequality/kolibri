from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from morango.models import Certificate
from requests import exceptions

from kolibri.core import error_constants
from kolibri.core.auth.management.utils import confirm_or_exit
from kolibri.core.auth.management.utils import get_facility
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
            "Facility: {} has been successfully registered.".format(facility.name)
        )

    def handle(self, *args, **options):
        facility_id = options["facility"]
        noninteractive = options["noninteractive"]
        token = options["token"]

        facility = get_facility(facility_id, noninteractive)
        # register the facility
        try:
            self._register(token, facility)
        except Certificate.DoesNotExist:
            raise CommandError(
                "This device does not own a certificate for Facility: {}".format(
                    facility.name
                )
            )
        # an invalid nonce/register response
        except exceptions.HTTPError as e:
            error = e.response.json()[0]
            message = error["metadata"].get("message") or e.response.text
            # handle facility not existing response from portal server
            if error["id"] == error_constants.FACILITY_DOES_NOT_EXIST:
                # if the facility does not exist on data portal, try syncing and retry registering
                if not noninteractive:
                    confirm_or_exit(
                        "Facility: {} does not exist on data portal server. Would you like to initiate a syncing session?".format(
                            facility.name
                        )
                    )
                    call_command(
                        "sync", facility=facility_id, noninteractive=noninteractive
                    )
                    confirm_or_exit(
                        "Facility: {} has been synced. Would you like to retry registering?".format(
                            facility.name
                        )
                    )
                    return self._register(token, facility)

            # display nice error messages for other Http errors
            raise CommandError(
                "{status} Client Error: For url: {url} Reason: {reason}".format(
                    status=e.response.status_code, url=e.response.url, reason=message
                )
            )
        # handle any other invalid response
        except exceptions.RequestException as e:
            raise CommandError(e)
