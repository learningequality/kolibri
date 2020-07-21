import getpass

import requests
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.core.management.base import CommandError
from django.core.validators import URLValidator
from django.urls import reverse
from django.utils.six.moves import input
from morango.models import Certificate
from morango.models import Filter
from morango.models import InstanceIDModel
from morango.models import ScopeDefinition
from morango.sync.controller import MorangoProfileController
from requests.exceptions import ConnectionError
from six.moves.urllib.parse import urljoin

from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.constants.morango_sync import ScopeDefinitions
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.utils import device_provisioned
from kolibri.core.device.utils import provision_device
from kolibri.core.tasks.management.commands.base import AsyncCommand


class Command(AsyncCommand):
    def add_arguments(self, parser):
        parser.add_argument("--dataset-id", type=str)
        parser.add_argument("--no-push", type=bool, default=False)
        parser.add_argument("--no-pull", type=bool, default=False)
        parser.add_argument("--base-url", type=str)
        parser.add_argument("--username", type=str)
        parser.add_argument("--password", type=str)
        parser.add_argument("--chunk-size", type=int, default=500)

    def get_dataset_id(self, base_url, dataset_id):
        # get list of facilities and if more than 1, display all choices to user
        facility_url = urljoin(base_url, reverse("kolibri:core:publicfacility-list"))
        facility_resp = requests.get(facility_url)
        facility_resp.raise_for_status()
        facilities = facility_resp.json()
        if len(facilities) > 1 and not dataset_id:
            message = "Please choose a facility to sync with:\n"
            for idx, f in enumerate(facilities):
                message += "{}. {}\n".format(idx + 1, f["name"])
            idx = input(message)
            dataset_id = facilities[int(idx) - 1]["dataset"]
        elif not dataset_id:
            dataset_id = facilities[0]["dataset"]
        return dataset_id

    def get_client_and_server_certs(self, username, password, dataset_id, nc):
        # get servers certificates which server has a private key for
        server_certs = nc.get_remote_certificates(
            dataset_id, scope_def_id=ScopeDefinitions.FULL_FACILITY
        )
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
            .filter(scope_definition_id=ScopeDefinitions.FULL_FACILITY)
            .exclude(_private_key=None)
        )

        # if we don't own any certs, do a csr request
        if not owned_certs:

            # prompt user for creds if not already specified
            if not username or not password:
                username = input("Please enter username: ")
                password = getpass.getpass("Please enter password: ")
            client_cert = nc.certificate_signing_request(
                server_cert,
                ScopeDefinitions.FULL_FACILITY,
                {"dataset_id": dataset_id},
                userargs=username,
                password=password,
            )
        else:
            client_cert = owned_certs[0]

        return client_cert, server_cert, username

    def create_superuser_and_provision_device(self, username, dataset_id):
        # Prompt user to pick a superuser if one does not currently exist
        while not DevicePermissions.objects.filter(is_superuser=True).exists():
            # specify username of account that will become a superuser
            if not username:
                username = input(
                    "Please enter username of account that will become the superuser on this device: "
                )
            if not FacilityUser.objects.filter(username=username).exists():
                self.stderr.write(
                    "User with username {} does not exist".format(username)
                )
                username = None
                continue

            # make the user with the given credentials, a superuser for this device
            user = FacilityUser.objects.get(username=username, dataset_id=dataset_id)

            # create permissions for the authorized user
            DevicePermissions.objects.update_or_create(
                user=user, defaults={"is_superuser": True, "can_manage_content": True}
            )

        # if device has not been provisioned, set it up
        if not device_provisioned():
            provision_device()

    def handle_async(self, *args, **options):
        self.stderr.write(
            "`fullfacilitysync` command is deprecated and will be removed in 0.13.0 in favor of `sync`, which accepts the same options."
            " Use `sync` command instead."
        )

        # validate url that is passed in
        try:
            URLValidator()((options["base_url"]))
        except ValidationError:
            raise CommandError(
                "Base URL is not valid. Please retry command and enter a valid URL."
            )

        # call this in case user directly syncs without migrating database
        if not ScopeDefinition.objects.filter():
            call_command("loaddata", "scopedefinitions")

        controller = MorangoProfileController(PROFILE_FACILITY_DATA)
        with self.start_progress(total=7) as progress_update:
            try:
                network_connection = controller.create_network_connection(
                    options["base_url"]
                )
            except ConnectionError:
                raise CommandError(
                    "Can not connect to server with base URL: {}".format(
                        options["base_url"]
                    )
                )

            # if instance_ids are equal, this means device is trying to sync with itself, which we don't allow
            if (
                InstanceIDModel.get_or_create_current_instance()[0].id
                == network_connection.server_info["instance_id"]
            ):
                raise CommandError(
                    "Device can not sync with itself. Please recheck base URL and try again."
                )

            progress_update(1)

            options["dataset_id"] = self.get_dataset_id(
                options["base_url"], options["dataset_id"]
            )
            progress_update(1)

            (
                client_cert,
                server_cert,
                options["username"],
            ) = self.get_client_and_server_certs(
                options["username"],
                options["password"],
                options["dataset_id"],
                network_connection,
            )
            progress_update(1)

            sync_client = network_connection.create_sync_session(
                client_cert, server_cert, chunk_size=options["chunk_size"]
            )
            progress_update(1)

            # pull from server and push our own data to server
            if not options["no_pull"]:
                sync_client.initiate_pull(Filter(options["dataset_id"]))
            if not options["no_push"]:
                sync_client.initiate_push(Filter(options["dataset_id"]))
            progress_update(1)

            self.create_superuser_and_provision_device(
                options["username"], options["dataset_id"]
            )
            progress_update(1)

            sync_client.close_sync_session()
            progress_update(1)
