import logging

from django.core.management.base import CommandError

from ...utils import paths
from kolibri.core.content.utils.content_export import export_content
from kolibri.core.tasks.management.commands.base import AsyncCommand

logger = logging.getLogger(__name__)


class Command(AsyncCommand):
    exported_size = 0
    total_resources = 0

    def add_arguments(self, parser):
        node_ids_help_text = """
        Specify one or more node IDs to import. Only the files associated to those node IDs will be imported.
        Make sure to call this near the end of the argument list.

        e.g.

        kolibri manage importcontent network <channel id> --node_ids <id1>,<id2>, [<ids>,...]
        """
        parser.add_argument(
            "--node_ids",
            "-n",
            # Split the comma separated string we get, into a list of strings
            type=lambda x: x.split(",") if x else [],
            default=None,
            required=False,
            dest="node_ids",
            help=node_ids_help_text,
        )

        exclude_node_ids_help_text = """
        Specify one or more node IDs to exclude. Files associated to those node IDs will be not be imported.
        Make sure to call this near the end of the argument list.

        e.g.

        kolibri manage importcontent network <channel id> --exclude_node_ids <id1>,<id2>, [<ids>,...]
        """
        parser.add_argument(
            "--exclude_node_ids",
            type=lambda x: x.split(",") if x else [],
            default=None,
            required=False,
            dest="exclude_node_ids",
            help=exclude_node_ids_help_text,
        )

        parser.add_argument("channel_id", type=str)
        parser.add_argument("destination", type=str)
        parser.add_argument(
            "--manifest-only",
            action="store_true",
            default=False,
            help="Generate only the manifest.json file",
        )

    def handle_async(self, *args, **options):
        if paths.using_remote_storage():
            raise CommandError("Cannot export files when using remote file storage")
        channel_id = options["channel_id"]
        destination = options["destination"]
        node_ids = options["node_ids"]
        exclude_node_ids = options["exclude_node_ids"]
        manifest_only = options["manifest_only"]

        export_content(
            channel_id,
            destination,
            manifest_only=manifest_only,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
        )
