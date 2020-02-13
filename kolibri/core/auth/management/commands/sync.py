import json

from django.core.management import call_command
from django.core.management.base import CommandError
from morango.models import Filter
from morango.models import InstanceIDModel
from morango.models import ScopeDefinition
from morango.sync.controller import MorangoProfileController

from ..utils import create_superuser_and_provision_device
from ..utils import get_baseurl
from ..utils import get_client_and_server_certs
from ..utils import get_dataset_id
from kolibri.core.auth.constants.morango_scope_definitions import FULL_FACILITY
from kolibri.core.auth.management.utils import get_facility
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.core.tasks.utils import db_task_write_lock
from kolibri.utils import conf

DATA_PORTAL_SYNCING_BASE_URL = conf.OPTIONS["Urls"]["DATA_PORTAL_SYNCING_BASE_URL"]


class Command(AsyncCommand):
    help = "Allow the syncing of facility data with Kolibri Data Portal or another Kolibri device."

    def add_arguments(self, parser):
        parser.add_argument(
            "--facility", action="store", type=str, help="ID of facility to sync"
        )
        parser.add_argument(
            "--baseurl", type=str, default=DATA_PORTAL_SYNCING_BASE_URL, dest="baseurl"
        )
        parser.add_argument("--noninteractive", action="store_true")
        parser.add_argument(
            "--chunk-size",
            type=int,
            default=500,
            help="Chunk size of records to send/retrieve per request",
        )
        parser.add_argument(
            "--no-push", action="store_true", help="Do not push data to the server"
        )
        parser.add_argument(
            "--no-pull", action="store_true", help="Do not pull data from the server"
        )
        parser.add_argument(
            "--username",
            type=str,
            help="username of superuser on server we are syncing with",
        )
        parser.add_argument(
            "--password",
            type=str,
            help="password of superuser on server we are syncing with",
        )
        # parser.add_argument("--scope-id", type=str, default=FULL_FACILITY)

    def handle_async(self, *args, **options):

        (
            baseurl,
            facility_id,
            chunk_size,
            username,
            password,
            no_push,
            no_pull,
            noninteractive,
        ) = (
            options["baseurl"],
            options["facility"],
            options["chunk_size"],
            options["username"],
            options["password"],
            options["no_push"],
            options["no_pull"],
            options["noninteractive"],
        )

        PORTAL_SYNC = baseurl == DATA_PORTAL_SYNCING_BASE_URL

        # validate url that is passed in
        if not PORTAL_SYNC:
            baseurl = get_baseurl(baseurl)

        # call this in case user directly syncs without migrating database
        if not ScopeDefinition.objects.filter():
            call_command("loaddata", "scopedefinitions")

        # try to connect to server
        controller = MorangoProfileController("facilitydata")
        network_connection = controller.create_network_connection(baseurl)

        # if instance_ids are equal, this means device is trying to sync with itself, which we don't allow
        if (
            InstanceIDModel.get_or_create_current_instance()[0].id
            == network_connection.server_info["instance_id"]
        ):
            raise CommandError(
                "Device can not sync with itself. Please recheck base URL and try again."
            )

        if PORTAL_SYNC:  # do portal sync setup
            facility = get_facility(
                facility_id=facility_id, noninteractive=noninteractive
            )

            # check for the certs we own for the specific facility
            client_cert = (
                facility.dataset.get_owned_certificates()
                .filter(scope_definition_id=FULL_FACILITY)
                .first()
            )
            if not client_cert:
                raise CommandError(
                    "This device does not own a certificate for Facility: {}".format(
                        facility.name
                    )
                )

            # get primary partition
            scope_params = json.loads(client_cert.scope_params)
            dataset_id = scope_params["dataset_id"]

            # check if the server already has a cert for this facility
            server_certs = network_connection.get_remote_certificates(
                dataset_id, scope_def_id=FULL_FACILITY
            )

            # if necessary, push a cert up to the server
            server_cert = (
                server_certs[0]
                if server_certs
                else network_connection.push_signed_client_certificate_chain(
                    local_parent_cert=client_cert,
                    scope_definition_id=FULL_FACILITY,
                    scope_params=scope_params,
                )
            )

        else:  # do P2P setup
            dataset_id = get_dataset_id(
                baseurl, identifier=facility_id, noninteractive=noninteractive
            )

            client_cert, server_cert, username = get_client_and_server_certs(
                username,
                password,
                dataset_id,
                network_connection,
                noninteractive=noninteractive,
            )

        self.stdout.write("Syncing has been initiated (this may take a while)...")

        sync_client = network_connection.create_sync_session(
            client_cert, server_cert, chunk_size=chunk_size
        )

        # pull from server and push our own data to server
        if not no_pull:
            with db_task_write_lock:
                sync_client.initiate_pull(Filter(dataset_id))
        if not no_push:
            with db_task_write_lock:
                sync_client.initiate_push(Filter(dataset_id))

        with db_task_write_lock:
            create_superuser_and_provision_device(
                username, dataset_id, noninteractive=noninteractive
            )
        sync_client.close_sync_session()
        self.stdout.write("Syncing has been completed.")
