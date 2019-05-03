import sys

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from morango.certificates import Certificate
from requests import exceptions

from kolibri.core.auth.utils import confirm_or_exit
from kolibri.core.auth.utils import get_facility
from kolibri.core.utils.portal import claim


class Command(BaseCommand):
    help = "Allows registering of facilities which have been synced to a portal server."

    def add_arguments(self, parser):
        parser.add_argument("token", action="store", type=str, help="Token of project")
        parser.add_argument(
            "--facility", action="store", type=str, help="ID of facility to register"
        )
        parser.add_argument("--noninteractive", action="store_true")

    def handle(self, *args, **options):
        facility_id = options["facility"]
        noninteractive = options["noninteractive"]
        token = options["token"]

        facility = get_facility(facility_id, noninteractive)
        # claim the facility
        try:
            claim(token, facility)
            self.stdout.write(
                "Facility: {} has been successfully registered.".format(facility.name)
            )
        except Certificate.DoesNotExist:
            raise CommandError(
                "This device does not own a certificate for Facility: {}".format(
                    facility.name
                )
            )
        # an invalid nonce/claim response
        except exceptions.HTTPError as e:
            # handle 404 responses from claim endpoint
            if e.response.status_code == 404:
                # if the facility does not exist on data portal, try syncing and retry registering
                if "Facility" in e.response.text:
                    if not noninteractive:
                        confirm_or_exit(
                            "Facility: {} does not exist on data portal server. Would you like to initiate a syncing session?".format(
                                facility.name
                            )
                        )
                        self.stdout.write("Syncing has been initiated...")
                        call_command(
                            "sync", facility=facility_id, noninteractive=noninteractive
                        )
                        confirm_or_exit(
                            "Facility: {} has been synced. Would you like to retry registering?".format(
                                facility.name
                            )
                        )
                        claim(token, facility)
                        self.stdout.write(
                            "Facility: {} has been successfully registered.".format(
                                facility.name
                            )
                        )
                        sys.exit(0)
                    else:
                        raise CommandError(
                            "Facility: {} does not exist on data portal server".format(
                                facility.name
                            )
                        )
                if "Community" in e.response.text:
                    raise CommandError(
                        'Learning Community with token "{}" does not exist on data portal server.'.format(
                            token
                        )
                    )
            # display nice error messages for other Http errors
            raise CommandError(
                "{status} Client Error: For url: {url} Reason: {reason}".format(
                    status=e.response.status_code,
                    url=e.response.url,
                    reason=e.response.text,
                )
            )
        # handle any other invalid response
        except exceptions.RequestException as e:
            raise CommandError(e)
