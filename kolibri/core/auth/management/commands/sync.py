import json
import re

from django.core.management import call_command
from django.core.management.base import CommandError
from morango.models import ScopeDefinition

from ..utils import get_client_and_server_certs
from ..utils import get_facility_dataset_id
from kolibri.core.auth.constants.morango_sync import DATA_PORTAL_SYNCING_BASE_URL
from kolibri.core.auth.constants.morango_sync import ScopeDefinitions
from kolibri.core.auth.management.utils import get_facility
from kolibri.core.auth.management.utils import get_network_connection
from kolibri.core.auth.management.utils import is_portal_sync
from kolibri.core.auth.management.utils import MorangoSyncCommand


class Command(MorangoSyncCommand):
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
            help="username of superuser or facility admin on server we are syncing with",
        )
        parser.add_argument(
            "--password",
            type=str,
            help="password of superuser or facility admin on server we are syncing with",
        )
        parser.add_argument(
            "--user",
            type=str,
            help="for single-user syncing, the user ID of the account to be synced",
        )
        parser.add_argument(
            "--no-provision",
            action="store_true",
            help="do not create a facility and temporary superuser",
        )
        parser.add_argument(
            "--keep-alive",
            action="store_true",
            help="do not close the sync session",
        )
        # parser.add_argument("--scope-id", type=str, default=FULL_FACILITY)

    def handle_async(self, *args, **options):
        (
            baseurl,
            facility_id,
            chunk_size,
            username,
            password,
            user_id,
            noninteractive,
        ) = (
            options["baseurl"],
            options["facility"],
            options["chunk_size"],
            options["username"],
            options["password"],
            options["user"],
            options["noninteractive"],
        )

        # call this in case user directly syncs without migrating database
        if not ScopeDefinition.objects.filter():
            call_command("loaddata", "scopedefinitions")

        # try to connect to server
        network_connection = get_network_connection(baseurl)
        baseurl = network_connection.base_url

        if user_id:  # it's a single-user sync

            if not facility_id:
                raise CommandError(
                    "Facility ID must be specified in order to do single-user syncing"
                )
            if not re.match("[a-f0-9]{32}", user_id):
                raise CommandError("User ID must be a 32-character UUID (no dashes)")

            facility_id, dataset_id = get_facility_dataset_id(
                baseurl, identifier=facility_id, noninteractive=True
            )

            client_cert, server_cert, username = get_client_and_server_certs(
                username,
                password,
                dataset_id,
                network_connection,
                user_id=user_id,
                facility_id=facility_id,
                noninteractive=noninteractive,
            )

            scopes = [client_cert.scope_definition_id, server_cert.scope_definition_id]

            if len(set(scopes)) != 2:
                raise CommandError(
                    "To do a single-user sync, one device must have a single-user certificate, and the other a full-facility certificate."
                )
        elif is_portal_sync(baseurl):  # do portal sync setup
            facility = get_facility(
                facility_id=facility_id, noninteractive=noninteractive
            )

            # check for the certs we own for the specific facility
            client_cert = (
                facility.dataset.get_owned_certificates()
                .filter(scope_definition_id=ScopeDefinitions.FULL_FACILITY)
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
                dataset_id, scope_def_id=ScopeDefinitions.FULL_FACILITY
            )

            # if necessary, push a cert up to the server
            server_cert = (
                server_certs[0]
                if server_certs
                else network_connection.push_signed_client_certificate_chain(
                    local_parent_cert=client_cert,
                    scope_definition_id=ScopeDefinitions.FULL_FACILITY,
                    scope_params=scope_params,
                )
            )

        else:  # do P2P setup
            facility_id, dataset_id = get_facility_dataset_id(
                baseurl, identifier=facility_id, noninteractive=noninteractive
            )

            client_cert, server_cert, username = get_client_and_server_certs(
                username,
                password,
                dataset_id,
                network_connection,
                facility_id=facility_id,
                noninteractive=noninteractive,
            )

        sync_session_client = network_connection.create_sync_session(
            client_cert, server_cert, chunk_size=chunk_size
        )

        self._sync(sync_session_client, **options)
