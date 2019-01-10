from django.core.management.base import CommandError

from kolibri.core.content.utils.importability_annotation import annotate_importability_from_disk
from kolibri.core.content.utils.importability_annotation import annotate_importability_from_remote
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.utils import conf


default_studio_url = conf.OPTIONS['Urls']['CENTRAL_CONTENT_BASE_URL']


class Command(AsyncCommand):

    def add_arguments(self, parser):
        # let's save the parser in case we need to print a help statement
        self._parser = parser

        parser.add_argument(
            'channel_id',
            type=str,
            help="Annotate importability on the database for the given channel_id."
        )

        parser.add_argument(
            "--baseurl",
            type=str,
            default='',
            help="The host we will check importability of the content from.",
        )

        parser.add_argument(
            '--directory',
            type=str,
            default='',
            help="Annotate importability based on content from this directory."
        )

    def handle_async(self, *args, **options):
        progress_extra_data = {
            "channel_id": options["channel_id"],
        }
        with self.start_progress(total=1) as progress_update:
            if options['baseurl']:
                if options['baseurl'] != default_studio_url:
                    annotate_importability_from_remote(options["channel_id"], options["baseurl"])
                progress_update(1, progress_extra_data)
            elif options['directory']:
                annotate_importability_from_disk(options["channel_id"], options["directory"])
                progress_update(1, progress_extra_data)
            else:
                self._parser.print_help()
                raise CommandError("Please specify either a baseurl or a directory")
