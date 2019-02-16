import logging
import os

from ...utils import import_export_content
from ...utils import paths
from ...utils import transfer
from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.tasks.management.commands.base import AsyncCommand

logger = logging.getLogger(__name__)


class Command(AsyncCommand):

    def add_arguments(self, parser):
        node_ids_help_text = """
        Specify one or more node IDs to import. Only the files associated to those node IDs will be imported.
        Make sure to call this near the end of the argument list.

        e.g.

        kolibri manage importcontent network <channel id> --node_ids <id1>,<id2>, [<ids>,...]
        """
        parser.add_argument(
            "--node_ids", "-n",
            # Split the comma separated string we get, into a list of strings
            type=lambda x: x.split(","),
            default=[],
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
            type=lambda x: x.split(","),
            default=[],
            required=False,
            dest="exclude_node_ids",
            help=exclude_node_ids_help_text
        )

        parser.add_argument("channel_id", type=str)
        parser.add_argument("destination", type=str)

    def handle_async(self, *args, **options):
        channel_id = options["channel_id"]
        data_dir = os.path.realpath(options["destination"])
        node_ids = options["node_ids"]
        exclude_node_ids = options["exclude_node_ids"]
        logger.info("Exporting content for channel id {} to {}".format(channel_id, data_dir))

        files, total_bytes_to_transfer = import_export_content.get_files_to_transfer(
            channel_id, node_ids, exclude_node_ids, True)

        exported_files = []

        with self.start_progress(total=total_bytes_to_transfer) as overall_progress_update:

            for f in files:

                if self.is_cancelled():
                    break

                filename = f.get_filename()

                try:
                    srcpath = paths.get_content_storage_file_path(filename)
                    dest = paths.get_content_storage_file_path(filename, datafolder=data_dir)
                except InvalidStorageFilenameError:
                    # If any files have an invalid storage file name, don't export them.
                    overall_progress_update(f.file_size)
                    continue

                # if the file already exists, add its size to our overall progress, and skip
                if os.path.isfile(dest) and os.path.getsize(dest) == f.file_size:
                    overall_progress_update(f.file_size)
                    continue

                copy = transfer.FileCopy(srcpath, dest)

                with copy:

                    with self.start_progress(total=copy.total_size) as file_cp_progress_update:

                        for chunk in copy:
                            if self.is_cancelled():
                                copy.cancel()
                                break
                            length = len(chunk)
                            overall_progress_update(length)
                            file_cp_progress_update(length)
                        else:
                            exported_files.append(dest)

            if self.is_cancelled():
                # Cancelled, clean up any already downloading files.
                for dest in exported_files:
                    os.remove(dest)
                self.cancel()
