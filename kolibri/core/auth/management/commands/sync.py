from kolibri.core.auth.constants.morango_sync import DATA_PORTAL_SYNCING_BASE_URL
from kolibri.core.auth.management.utils import MorangoSyncCommand
from kolibri.core.auth.utils.sync import perform_sync


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
            default=200,
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
        perform_sync(
            baseurl=options["baseurl"],
            facility=options["facility"],
            chunk_size=options["chunk_size"],
            username=options["username"],
            password=options["password"],
            user=options["user"],
            noninteractive=options["noninteractive"],
            no_push=options["no_push"],
            no_pull=options["no_pull"],
            no_provision=options["no_provision"],
            keep_alive=options["keep_alive"],
        )
