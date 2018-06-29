import logging as logger
import os
from time import sleep

import requests
from django.core.management.base import CommandError
from requests.exceptions import ConnectionError
from requests.exceptions import HTTPError

from ...utils import annotation
from ...utils import import_export_content
from ...utils import paths
from ...utils import transfer
from kolibri.tasks.management.commands.base import AsyncCommand
from kolibri.utils import conf

# constants to specify the transfer method to be used
DOWNLOAD_METHOD = "download"
COPY_METHOD = "copy"
RETRY_STATUS_CODE = [502, 503, 504, 521, 522, 523, 524]

logging = logger.getLogger(__name__)


class Command(AsyncCommand):

    def add_arguments(self, parser):
        # let's save the parser in case we need to print a help statement
        self._parser = parser

        # we want two groups of arguments. One group is when the
        # 'importcontent disk' command is given, where we'll expect a file
        # directory to be given. Another is the 'importcontent network'
        # command to be given, where we'll expect a channel.

        # However, some optional arguments apply to both groups. Add them here!
        node_ids_help_text = """
        Specify one or more node IDs to import. Only the files associated to those node IDs will be imported.

        e.g.

        kolibri manage importcontent --node_ids <id1>,<id2>, [<ids>,...] {network, disk} <channel id>
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

        e.g.

        kolibri manage importcontent --exclude_node_ids <id1>,<id2>, [<ids>,...] {network, disk} <channel id>
        """
        parser.add_argument(
            "--exclude_node_ids",
            # Split the comma separated string we get, into a list of string
            type=lambda x: x.split(","),
            default=[],
            required=False,
            dest="exclude_node_ids",
            help=exclude_node_ids_help_text
        )

        parser.add_argument(
            "--include-unrenderable-content",
            action='store_false',
            default=True,
            dest="renderable_only",
            help="Import all content, not just that which this Kolibri instance can render"
        )

        # to implement these two groups of commands and their corresponding
        # arguments, we'll need argparse.subparsers.
        subparsers = parser.add_subparsers(dest='command', help="The following subcommands are available.")

        # the network command has a channel id required positional argument,
        # and some optional content_id arguments.

        # TODO: implement a --content-domain parameter, for optionally
        # specifying the domain for the curation server.

        # Note: cmd should be the management command instance, as though the
        # interface for adding arguments is argparse, Django overrides the
        # parser object with its own thing, hence why we need to add cmd. See
        # http://stackoverflow.com/questions/36706220/is-it-possible-to-create-subparsers-in-a-django-management-command
        network_subparser = subparsers.add_parser(
            name='network',
            cmd=self,
            help="Download the given channel through the network.",
        )
        network_subparser.add_argument('channel_id', type=str)

        default_studio_url = conf.OPTIONS['Urls']['CENTRAL_CONTENT_BASE_URL']
        network_subparser.add_argument(
            "--baseurl",
            type=str,
            default=default_studio_url,
            dest="baseurl",
        )

        disk_subparser = subparsers.add_parser(
            name='disk',
            cmd=self,
            help='Copy the content from the given folder.'
        )
        disk_subparser.add_argument('channel_id', type=str)
        disk_subparser.add_argument('directory', type=str)

    def download_content(self, channel_id, node_ids=None, exclude_node_ids=None, baseurl=None, renderable_only=True):
        self._transfer(DOWNLOAD_METHOD, channel_id, node_ids=node_ids, exclude_node_ids=exclude_node_ids, baseurl=baseurl, renderable_only=renderable_only)

    def copy_content(self, channel_id, path, node_ids=None, exclude_node_ids=None, renderable_only=True):
        self._transfer(COPY_METHOD, channel_id, path=path, node_ids=node_ids, exclude_node_ids=exclude_node_ids, renderable_only=renderable_only)

    def _transfer(self, method, channel_id, path=None, node_ids=None, exclude_node_ids=None, baseurl=None, renderable_only=True):  # noqa: max-complexity=16

        files_to_download, total_bytes_to_transfer = import_export_content.get_files_to_transfer(
            channel_id, node_ids, exclude_node_ids, False, renderable_only=renderable_only)

        number_of_skipped_files = 0
        file_checksums_to_annotate = []

        with self.start_progress(total=total_bytes_to_transfer) as overall_progress_update:

            if method == DOWNLOAD_METHOD:
                session = requests.Session()

            for f in files_to_download:

                if self.is_cancelled():
                    break

                filename = f.get_filename()
                dest = paths.get_content_storage_file_path(filename)

                # if the file already exists, add its size to our overall progress, and skip
                if os.path.isfile(dest) and os.path.getsize(dest) == f.file_size:
                    overall_progress_update(f.file_size)
                    file_checksums_to_annotate.append(f.id)
                    continue

                # determine where we're downloading/copying from, and create appropriate transfer object
                if method == DOWNLOAD_METHOD:
                    url = paths.get_content_storage_remote_url(filename, baseurl=baseurl)
                    filetransfer = transfer.FileDownload(url, dest, session=session)
                elif method == COPY_METHOD:
                    srcpath = paths.get_content_storage_file_path(filename, datafolder=path)
                    filetransfer = transfer.FileCopy(srcpath, dest)

                finished = False
                while not finished:
                    finished, increment = self._start_file_transfer(
                        f, filetransfer, overall_progress_update)
                    if increment == 2:
                        file_checksums_to_annotate.append(f.id)
                    else:
                        number_of_skipped_files += increment

            annotation.set_availability(channel_id, file_checksums_to_annotate)

            if number_of_skipped_files > 0:
                logging.warning(
                    "{} files are skipped, because they do not exist.".format(
                        number_of_skipped_files))

            if self.is_cancelled():
                self.cancel()

    def _start_file_transfer(self, f, filetransfer, overall_progress_update):
        """
        Start to transfer the file from network/disk to the destination.
        Return value:
            * True, 2 - successfully transfer the file.
            * True, 1 - the file does not exist so it is skipped.
            * True, 0 - the transfer is cancelled.
            * Fail, 0 - the transfer fails and needs to retry.
        """
        try:
            with filetransfer, self.start_progress(total=filetransfer.total_size) as file_dl_progress_update:
                for chunk in filetransfer:
                    if self.is_cancelled():
                        filetransfer.cancel()
                        return True, 0
                    length = len(chunk)
                    overall_progress_update(length)
                    file_dl_progress_update(length)
            return True, 2

        except Exception as e:
            logging.error("An error occured during content import: {}".format(e))

            # When there is an Internet connection error or timeout error,
            # or HTTPError where the error code is one of the RETRY_STATUS_CODE,
            # return False, 0 to retry the file transfer, or return True, 0 to
            # indicate the cancellation
            if (isinstance(e, ConnectionError) or
                    (isinstance(e, HTTPError) and e.response.status_code in RETRY_STATUS_CODE)):
                return self._sleep_before_retry(), 0

            # Skip the file if it does not exist on the server or disk
            elif ((isinstance(e, HTTPError) and e.response.status_code == 404) or
                    (isinstance(e, OSError) and e.errno == 2)):
                overall_progress_update(f.file_size)
                return True, 1

            else:
                raise e

    def _sleep_before_retry(self):
        for i in range(30):
            if self.is_cancelled():
                self.cancel()
                return True
            sleep(1)
        return False

    def handle_async(self, *args, **options):
        if options['command'] == 'network':
            self.download_content(options["channel_id"],
                                  node_ids=options["node_ids"],
                                  exclude_node_ids=options['exclude_node_ids'],
                                  baseurl=options["baseurl"],
                                  renderable_only=options["renderable_only"])
        elif options['command'] == 'disk':
            self.copy_content(options["channel_id"],
                              options["directory"],
                              node_ids=options["node_ids"],
                              exclude_node_ids=options["exclude_node_ids"],
                              renderable_only=options["renderable_only"])
        else:
            self._parser.print_help()
            raise CommandError("Please give a valid subcommand. You gave: {}".format(options["command"]))
