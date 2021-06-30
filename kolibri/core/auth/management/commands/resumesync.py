from morango.errors import MorangoError
from morango.models.core import SyncSession

from kolibri.core.auth.constants.morango_sync import DATA_PORTAL_SYNCING_BASE_URL
from kolibri.core.auth.management.utils import get_network_connection
from kolibri.core.auth.management.utils import MorangoSyncCommand


class Command(MorangoSyncCommand):
    help = "Allow the syncing of facility data with Kolibri Data Portal or another Kolibri device."

    def add_arguments(self, parser):
        parser.add_argument(
            "--id", type=str, help="ID of an incomplete session to resume sync"
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
            "--no-provision",
            action="store_true",
            help="do not create a facility and temporary superuser",
        )
        parser.add_argument(
            "--keep-alive",
            action="store_true",
            help="do not close the sync session",
        )
        parser.add_argument(
            "--close-on-error",
            action="store_true",
            help="close the sync session if an error is encountered",
        )

    def handle_async(self, *args, **options):
        (baseurl, sync_session_id, chunk_size, close_on_error,) = (
            options["baseurl"],
            options["id"],
            options["chunk_size"],
            options["close_on_error"],
        )

        # try to connect to server
        network_connection = get_network_connection(baseurl)
        sync_session_client = None

        try:
            sync_session_client = network_connection.resume_sync_session(
                sync_session_id, chunk_size=chunk_size
            )
            self._sync(sync_session_client, **options)
        except MorangoError as e:
            # if told to, we'll try to close the session on an error, then re-raise
            if close_on_error:
                if sync_session_client is None:
                    try:
                        sync_session = SyncSession.objects.get(pk=sync_session_id)
                        network_connection.close_sync_session(sync_session)
                    finally:
                        network_connection.close()
                else:
                    sync_session_client.close_sync_session()
            raise e
