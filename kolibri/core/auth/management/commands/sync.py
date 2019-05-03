import json

from django.core.management.base import CommandError
from morango.certificates import Filter
from morango.controller import MorangoProfileController

from kolibri.core.auth.constants.morango_scope_definitions import FULL_FACILITY
from kolibri.core.auth.utils import get_facility
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.utils import conf


class Command(AsyncCommand):
    help = "Allow the syncing of facility data to the Kolibri Data Portal."

    def add_arguments(self, parser):
        parser.add_argument(
            "--facility", action="store", type=str, help="ID of facility to sync"
        )
        parser.add_argument("--noninteractive", action="store_true")

    def handle_async(self, *args, **options):

        facility = get_facility(
            facility_id=options["facility"], noninteractive=options["noninteractive"]
        )

        controller = MorangoProfileController("facilitydata")
        with self.start_progress(total=5) as progress_update:
            network_connection = controller.create_network_connection(
                conf.OPTIONS["Urls"]["DATA_PORTAL_SYNCING_BASE_URL"]
            )
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
                client_cert, server_cert
            )
            progress_update(1)

            sync_client.initiate_push(Filter(scope_params["dataset_id"]))
            progress_update(1)

            sync_client.close_sync_session()
            progress_update(1)
