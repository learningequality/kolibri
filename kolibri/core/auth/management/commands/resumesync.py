from kolibri.core.auth.constants.morango_sync import DATA_PORTAL_SYNCING_BASE_URL
from kolibri.core.auth.management.utils import MorangoSyncCommand
from kolibri.core.auth.utils.sync import perform_resumesync


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
            "--user",
            type=str,
            help="for single-user syncing, the user ID of the account to be synced",
        )
        parser.add_argument(
            "--keep-alive",
            action="store_true",
            help="do not close the sync session",
        )

    def handle_async(self, *args, **options):
        perform_resumesync(
            id=options["id"],
            baseurl=options["baseurl"],
            chunk_size=options["chunk_size"],
            noninteractive=options["noninteractive"],
            no_push=options["no_push"],
            no_pull=options["no_pull"],
            no_provision=options["no_provision"],
            user=options["user"],
            keep_alive=options["keep_alive"],
        )
