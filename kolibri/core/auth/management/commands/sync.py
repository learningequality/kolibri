import json
import sys

from django.core.management import call_command
from django.core.management.base import CommandError
from morango.certificates import Filter
from morango.controller import MorangoProfileController
from requests.exceptions import ConnectionError

from kolibri.core.auth.constants.morango_scope_definitions import FULL_FACILITY
from kolibri.core.auth.management.utils import get_facility
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.utils import conf

DATA_PORTAL_SYNCING_BASE_URL = conf.OPTIONS["Urls"]["DATA_PORTAL_SYNCING_BASE_URL"]


class Command(AsyncCommand):
    help = "Allow the syncing of facility data to the Kolibri Data Portal."

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

    def _fullfacilitysync(self, baseurl, facility=None, chunk_size=500):
        if facility is None:
            dataset_id = None
        else:
            dataset_id = facility.dataset_id

        if baseurl != DATA_PORTAL_SYNCING_BASE_URL:
            self.stdout.write("Syncing has been initiated (this may take a while)...")
            call_command(
                "fullfacilitysync",
                base_url=baseurl,
                dataset_id=dataset_id,
                chunk_size=chunk_size,
            )
            self.stdout.write("Syncing has been completed.")
            sys.exit(0)

    def handle_async(self, *args, **options):

        baseurl = options["baseurl"]
        facility_id = options["facility"]
        chunk_size = options["chunk_size"]

        # This handles the case for when we want to pull in facility data for our empty kolibri instance
        if not facility_id:
            self._fullfacilitysync(baseurl)

        facility = get_facility(
            facility_id=facility_id, noninteractive=options["noninteractive"]
        )

        # if url is not pointing to portal server, do P2P syncing
        self._fullfacilitysync(baseurl, facility=facility, chunk_size=chunk_size)

        # data portal syncing
        self.stdout.write("Syncing has been initiated (this may take a while)...")
        controller = MorangoProfileController("facilitydata")
        with self.start_progress(total=5) as progress_update:
            try:
                network_connection = controller.create_network_connection(baseurl)
            except ConnectionError as e:
                raise CommandError(e)
            progress_update(1)

            # get client certificate
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

            # push certificate up to portal server
            scope_params = json.loads(client_cert.scope_params)
            server_cert = network_connection.push_signed_client_certificate_chain(
                local_parent_cert=client_cert,
                scope_definition_id=FULL_FACILITY,
                scope_params=scope_params,
            )
            progress_update(1)

            # we should now be able to push our facility data
            sync_client = network_connection.create_sync_session(
                client_cert, server_cert, chunk_size=chunk_size
            )
            progress_update(1)

            sync_client.initiate_push(Filter(scope_params["dataset_id"]))
            progress_update(1)

            sync_client.close_sync_session()
            progress_update(1)
            self.stdout.write("Syncing has been completed.")
