import logging

from kolibri.core.content.utils.content_delete import delete_content
from kolibri.core.tasks.management.commands.base import AsyncCommand


logger = logging.getLogger(__name__)


class Command(AsyncCommand):
    def add_arguments(self, parser):
        parser.add_argument("channel_id", type=str)
        # However, some optional arguments apply to both groups. Add them here!
        node_ids_help_text = """
        Specify one or more node IDs to delete. Only these ContentNodes and descendants will be deleted.

        e.g.

        kolibri manage deletecontent --node_ids <id1>,<id2>,[<ids>,...] <channel id>
        """
        parser.add_argument(
            "--node_ids",
            "-n",
            # Split the comma separated string we get, into a list of strings
            type=lambda x: x.split(","),
            default=[],
            required=False,
            dest="node_ids",
            help=node_ids_help_text,
        )

        exclude_node_ids_help_text = """
        Specify one or more node IDs to exclude. Descendants of these node IDs will be not be deleted.

        e.g.

        kolibri manage deletecontent --exclude_node_ids <id1>,<id2>,[<ids>,...] <channel id>
        """
        parser.add_argument(
            "--exclude_node_ids",
            # Split the comma separated string we get, into a list of string
            type=lambda x: x.split(","),
            default=[],
            required=False,
            dest="exclude_node_ids",
            help=exclude_node_ids_help_text,
        )
        parser.add_argument(
            "-f",
            "--force_delete",
            action="store_true",
            dest="force_delete",
            default=False,
            help="Ensure removal of files",
        )

        parser.add_argument(
            "--ignore_admin_flags",
            action="store_false",
            dest="ignore_admin_flags",
            default=True,
            help="Don't modify admin_imported values when deleting content",
        )

        parser.add_argument(
            "--update_content_requests",
            action="store_false",
            dest="update_content_requests",
            default=True,
            help="Don't modify the status of ContentRequests pointing at the deleted content",
        )

    def handle_async(self, *args, **options):
        channel_id = options["channel_id"]
        node_ids = options["node_ids"]
        exclude_node_ids = options["exclude_node_ids"]
        force_delete = options["force_delete"]
        ignore_admin_flags = options["ignore_admin_flags"]
        update_content_requests = options["update_content_requests"]

        delete_content(
            channel_id,
            node_ids,
            exclude_node_ids,
            force_delete,
            ignore_admin_flags=ignore_admin_flags,
            update_content_requests=update_content_requests,
        )
