"""
Utility methods for syncing.
"""

import getpass
import logging
import sys
from contextlib import contextmanager

from django.core.management.base import CommandError

from kolibri.core.auth.errors import FacilityLookupError
from kolibri.core.auth.errors import MultipleFacilitiesError
from kolibri.core.auth.errors import SyncError
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.utils import facility as facility_utils
from kolibri.core.device.models import DevicePermissions
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import URLParseError

logger = logging.getLogger(__name__)

MULTIPLE_FACILITIES_HINT = (
    "Please pass in a facility ID by passing in --facility {ID} after the command."
)


def confirm_or_exit(message):
    answer = ""
    while answer not in ["yes", "n", "no"]:
        answer = input(f"{message} [Type 'yes' or 'no'.] ").lower()
    if answer != "yes":
        logger.info("Canceled! Exiting without touching the database.")
        sys.exit(1)


def _interactive_facility_selection(message, facilities, names):
    for idx, name in enumerate(names):
        message += f"{idx + 1}. {name}\n"
    answer = input(message)
    error = CommandError(f"{answer} is not in the range of (1, {len(facilities)})")
    try:
        idx = int(answer)
    except ValueError as e:
        raise error from e
    if not 1 <= idx <= len(facilities):
        raise error
    return facilities[idx - 1]


def _interactive_client_facility_selection(facilities):
    return _interactive_facility_selection(
        "Please choose a facility:\n", facilities, [f.name for f in facilities]
    )


def _interactive_server_facility_selection(facilities):
    return _interactive_facility_selection(
        "Please choose a facility to sync with:\n",
        facilities,
        [f["name"] for f in facilities],
    )


def get_facility(facility_id=None, noninteractive=False):
    try:
        return facility_utils.get_facility(facility_id=facility_id)
    except MultipleFacilitiesError as e:
        if noninteractive:
            raise CommandError(f"{e} {MULTIPLE_FACILITIES_HINT}") from e
        # in interactive mode, allow user to select facility
        return _interactive_client_facility_selection(e.facilities)
    except FacilityLookupError as e:
        raise CommandError(str(e)) from e


@contextmanager
def sync_errors_as_command_errors(baseurl):
    try:
        yield
    except URLParseError as e:
        raise CommandError(
            f"Base URL/IP: {baseurl} is not valid. Please retry command and enter a valid URL/IP."
        ) from e
    except NetworkLocationNotFound as e:
        raise CommandError(f"Unable to connect to: {baseurl}") from e
    except MultipleFacilitiesError as e:
        raise CommandError(f"{e} {MULTIPLE_FACILITIES_HINT}") from e
    except (FacilityLookupError, SyncError) as e:
        raise CommandError(str(e)) from e


class InteractiveSyncMixin:
    """
    Prompts the CLI user for what a noninteractive sync manager raises on or defaults
    """

    def get_facility(self, facility_id):
        try:
            return super().get_facility(facility_id)
        except MultipleFacilitiesError as e:
            return _interactive_client_facility_selection(e.facilities)

    def get_facility_dataset_id(self, baseurl, facility_id):
        try:
            return super().get_facility_dataset_id(baseurl, facility_id)
        except MultipleFacilitiesError as e:
            facility = _interactive_server_facility_selection(e.facilities)
            return facility["id"], facility["dataset"]

    def get_credentials(self):
        username = input("Please enter username: ")
        password = getpass.getpass("Please enter password: ")
        return username, password

    def get_superuser_username(self, username):
        if DevicePermissions.objects.filter(is_superuser=True).exists():
            return username
        # Prompt user to pick a superuser if one does not currently exist
        while not FacilityUser.objects.filter(username=username).exists():
            if username:
                logger.error(
                    "User with username `%s` does not exist on this device", username
                )
            # specify username of account that will become a superuser
            username = input(
                "Please enter username of account that will become the superuser on this device: "
            )
        return username
