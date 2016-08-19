import os

from django.conf import settings
from django.core.management.base import CommandError
from django.db.models import Sum
from kolibri.tasks.management.commands.base import AsyncCommand

from ...content_db_router import using_content_database
from ...models import File
from ...utils import paths, transfer

CONTENT_DEST_PATH_TEMPLATE = os.path.join(
    settings.CONTENT_STORAGE_DIR,
    "{filename}",
)


class Command(AsyncCommand):

    def add_arguments(self, parser):
        # let's save the parser in case we need to print a help statement
        self._parser = parser

        # we want two groups of arguments. One group is when the
        # 'retrievecontent local' command is given, where we'll expect a file
        # directory to be given. Another is the 'retrievecontent network'
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
            help='Download the content from the given folder.'
        )
        local_subparser.add_argument('directory', type=str)

    def handle_network_download(self, *args, **options):
        channel_id = options["channel_id"]

        with using_content_database(channel_id):
            files = File.objects.all()
            total_bytes_to_download = files.aggregate(Sum('file_size'))['file_size__sum']

            with self.start_progress(total=total_bytes_to_download) as overall_progress_update:

                for f in files:
                    filename = f.get_filename()
                    url = paths.get_content_storage_file_url(filename)
                    path = paths.get_content_storage_file_path(filename)

                    # if the file already exists, add its size to our overall progress, and skip
                    # TODO(jamalex): could do md5 checks here instead, to be ultra-safe
                    if os.path.isfile(path) and os.path.getsize(path) == f.file_size:
                        overall_progress_update(f.file_size)
                        continue

                    with transfer.FileDownload(url, path) as download:

                        with self.start_progress(total=download.total_size) as file_dl_progress_update:

                            for chunk in download:
                                length = len(chunk)
                                overall_progress_update(length)
                                file_dl_progress_update(length)

    def handle_filesystem_copy(self, *args, **options):
        pass

    def handle_async(self, *args, **options):
        if options['command'] == 'network':
            self.handle_network_download(*args, **options)
        elif options['command'] == 'local':
            self.handle_filesystem_copy(*args, **options)
        else:
            self._parser.print_help()
            raise CommandError("Please give a valid subcommand. Options you gave: {}".format(options))
