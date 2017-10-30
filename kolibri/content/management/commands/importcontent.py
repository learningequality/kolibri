import os

from django.core.management.base import CommandError
from django.db.models import Sum
from kolibri.tasks.management.commands.base import AsyncCommand
from requests.exceptions import HTTPError

from ...models import LocalFile
from ...utils import annotation, paths, transfer

# constants to specify the transfer method to be used
DOWNLOAD_METHOD = "download"
COPY_METHOD = "copy"

class Command(AsyncCommand):

    def add_arguments(self, parser):
        # let's save the parser in case we need to print a help statement
        self._parser = parser

        # we want two groups of arguments. One group is when the
        # 'importcontent local' command is given, where we'll expect a file
        # directory to be given. Another is the 'importcontent network'
        # command to be given, where we'll expect a channel.

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
            help="Download the given channel through the network."
        )
        network_subparser.add_argument('channel_id', type=str)
        network_subparser.add_argument(
            'content_id',
            nargs="*",  # 0 or more arguments of content_id can be passed in.
            type=str,
            default=[],
        )

        local_subparser = subparsers.add_parser(
            name='local',
            cmd=self,
            help='Copy the content from the given folder.'
        )
        local_subparser.add_argument('channel_id', type=str)
        local_subparser.add_argument('directory', type=str)

    def download_content(self, channel_id):
        self._transfer(DOWNLOAD_METHOD, channel_id)

    def copy_content(self, channel_id, path):
        self._transfer(COPY_METHOD, channel_id, path=path)

    def _transfer(self, method, channel_id, path=None):  # noqa: max-complexity=16

        files_to_download = LocalFile.objects.filter(files__contentnode__channel_id=channel_id, available=False).distinct()
        total_bytes_to_transfer = files_to_download.aggregate(Sum('file_size'))['file_size__sum'] or 0

        downloaded_files = []
        file_checksums_to_annotate = []

        with self.start_progress(total=total_bytes_to_transfer) as overall_progress_update:

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
                    url = paths.get_content_storage_remote_url(filename)
                    filetransfer = transfer.FileDownload(url, dest)
                elif method == COPY_METHOD:
                    srcpath = paths.get_content_storage_file_path(filename, datafolder=path)
                    filetransfer = transfer.FileCopy(srcpath, dest)

                try:

                    with filetransfer:

                        with self.start_progress(total=filetransfer.total_size) as file_dl_progress_update:

                            for chunk in filetransfer:
                                if self.is_cancelled():
                                    filetransfer.cancel()
                                    break
                                length = len(chunk)
                                overall_progress_update(length)
                                file_dl_progress_update(length)
                            else:
                                # If the for loop didn't break, add this to downloaded files.
                                downloaded_files.append(dest)

                    file_checksums_to_annotate.append(f.id)

                except HTTPError:
                    overall_progress_update(f.file_size)

            if self.is_cancelled():
                # Cancelled, clean up any already downloading files.
                for dest in downloaded_files:
                    os.remove(dest)
                self.cancel()
            else:
                annotation.set_availability(file_checksums_to_annotate)

    def handle_async(self, *args, **options):
        if options['command'] == 'network':
            self.download_content(options["channel_id"])
        elif options['command'] == 'local':
            self.copy_content(options["channel_id"], options["directory"])
        else:
            self._parser.print_help()
            raise CommandError("Please give a valid subcommand. You gave: {}".format(options["command"]))
