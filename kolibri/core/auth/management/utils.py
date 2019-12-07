"""
Utility methods for syncing.
"""
import getpass

import requests
from django.core.management.base import CommandError
from django.urls import reverse
from django.utils.six.moves import input
from morango.models import Certificate
from six.moves.urllib.parse import urljoin

from kolibri.core.auth.constants.morango_scope_definitions import FULL_FACILITY
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.utils import device_provisioned
from kolibri.core.device.utils import provision_device
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import URLParseError


def _interactive_client_facility_selection():
    facilities = Facility.objects.all()
    message = "Please choose a facility to sync:\n"
    for idx, facility in enumerate(facilities):
        message += "{}. {}\n".format(idx + 1, facility.name)
    idx = input(message)
    try:
        facility = facilities[int(idx) - 1]
    except IndexError:
        raise CommandError(
            (
                "{idx} is not in the range of (1, {range})".format(
                    idx=idx, range=len(facilities)
                )
            )
        )
    return facility


def _interactive_server_facility_selection(facilities):
    message = "Please choose a facility to sync with:\n"
    for idx, f in enumerate(facilities):
        message += "{}. {}\n".format(idx + 1, f["name"])
    idx = input(message)
    try:
        return facilities[int(idx) - 1]["dataset"]
    except IndexError:
        raise CommandError(
            (
                "{idx} is not in the range of (1, {range})".format(
                    idx=idx, range=len(facilities)
                )
            )
        )


def get_facility(facility_id=None, noninteractive=False):
    # try to get a valid facility from id
    if facility_id:
        try:
            facility = Facility.objects.get(id=facility_id)
        except Facility.DoesNotExist:
            raise CommandError("Facility with ID {} does not exist".format(facility_id))
    # if no id passed in, assume only one facility on device
    else:
        try:
            facility = Facility.objects.get()
        except Facility.DoesNotExist:
            raise CommandError(
                (
                    "There are no facilities on this device. "
                    "Please initialize your Kolibri installation by starting the server, loading Kolibri in the browser, "
                    "and completing the setup instructions. "
                )
            )
        except Facility.MultipleObjectsReturned:
            if noninteractive:
                raise CommandError(
                    (
                        "There are multiple facilities on this device. "
                        "Please pass in a facility ID by passing in --facility {ID} after the command."
                    )
                )
            else:
                # in interactive mode, allow user to select facility
                facility = _interactive_client_facility_selection()

    return facility


def get_dataset_id(baseurl, identifier=None, noninteractive=False):
    # get list of facilities and if more than 1, display all choices to user
    facility_url = urljoin(baseurl, reverse("kolibri:core:publicfacility-list"))
    response = requests.get(facility_url)
    response.raise_for_status()
    facilities = response.json()
    if not facilities:
        raise CommandError("There are no facilities available at: {}".format(baseurl))
    # if provided, look up identifier in list of dataset and facility ids
    if identifier:
        for obj in facilities:
            if identifier == obj["dataset"] or identifier == obj.get("id"):
                return obj["dataset"]
        raise CommandError(
            "Facility with ID {} does not exist on server".format(identifier)
        )

    if noninteractive and len(facilities) > 1:
        raise CommandError(
            (
                "There are multiple facilities on the server. "
                "Please pass in a facility ID by passing in --facility {ID} after the command."
            )
        )
    else:
        return (
            _interactive_server_facility_selection(facilities)
            if len(facilities) > 1
            else facilities[0]["dataset"]
        )


def get_baseurl(baseurl):
    try:
        return NetworkClient(address=baseurl).base_url
    except URLParseError:
        raise CommandError(
            "Base URL/IP: {} is not valid. Please retry command and enter a valid URL/IP.".format(
                baseurl
            )
        )
    except NetworkLocationNotFound:
        raise CommandError("Unable to connect to: {}".format(baseurl))


def get_client_and_server_certs(
    username, password, dataset_id, nc, noninteractive=False
):
    # get servers certificates which server has a private key for
    server_certs = nc.get_remote_certificates(dataset_id, scope_def_id=FULL_FACILITY)
    if not server_certs:
        raise CommandError(
            "Server does not have any certificates for dataset_id: {}".format(
                dataset_id
            )
        )
    server_cert = server_certs[0]

    # check for the certs we own for the specific facility
    owned_certs = (
        Certificate.objects.filter(id=dataset_id)
        .get_descendants(include_self=True)
        .filter(scope_definition_id=FULL_FACILITY)
        .exclude(_private_key=None)
    )

    # if we don't own any certs, do a csr request
    if not owned_certs:

        # prompt user for creds if not already specified
        if not username or not password:
            if noninteractive:
                raise CommandError("Server username and/or password not specified")
            else:
                username = input("Please enter username: ")
                password = getpass.getpass("Please enter password: ")

        client_cert = nc.certificate_signing_request(
            server_cert,
            FULL_FACILITY,
            {"dataset_id": dataset_id},
            userargs=username,
            password=password,
        )
    else:
        client_cert = owned_certs[0]

    return client_cert, server_cert, username


def create_superuser_and_provision_device(username, dataset_id, noninteractive=False):
    facility = Facility.objects.get(dataset_id=dataset_id)
    # if device has not been provisioned, set it up
    if not device_provisioned():
        provision_device(default_facility=facility)

    # Prompt user to pick a superuser if one does not currently exist
    while not DevicePermissions.objects.filter(is_superuser=True).exists():
        # specify username of account that will become a superuser
        if not username:
            if (
                noninteractive
            ):  # we don't want to setup a device without a superuser, so create a temporary one
                superuser = FacilityUser.objects.create(
                    username="superuser", facility=facility
                )
                superuser.set_password("password")
                superuser.save()
                DevicePermissions.objects.create(
                    user=superuser, is_superuser=True, can_manage_content=True
                )
                print(
                    "Temporary superuser with username: `superuser` and password: `password` created"
                )
                return
            username = input(
                "Please enter username of account that will become the superuser on this device: "
            )
        if not FacilityUser.objects.filter(username=username).exists():
            print(
                "User with username `{}` does not exist on this device".format(username)
            )
            username = None
            continue

        # make the user with the given credentials, a superuser for this device
        user = FacilityUser.objects.get(username=username, dataset_id=dataset_id)

        # create permissions for the authorized user
        DevicePermissions.objects.update_or_create(
            user=user, defaults={"is_superuser": True, "can_manage_content": True}
        )
