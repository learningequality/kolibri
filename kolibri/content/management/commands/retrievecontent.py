import os
import requests
from django.db.models import Sum
from django.conf import settings

from kolibri.content.content_db_router import using_content_database
from kolibri.content.models import ChannelMetadata, ContentNode, File
from kolibri.tasks.management.commands.base import AsyncCommand


class Command(AsyncCommand):

    def add_arguments(self, parser):
        parser.add_argument('channel_id', type=str)
        parser.add_argument('content_id',
                            nargs="*",  # 0 or more arguments of content_id can be passed in.
                            type=str)

    def handle_async(self, *args, **options):
        channel_id = options["channel_id"]

        content_download_url_template = os.path.join(
            settings.CENTRAL_CONTENT_DOWNLOAD_DOMAIN,
            "{filename}",
        )
        content_path_template = os.path.join(
            settings.CONTENT_STORAGE_DIR,
            "{filename}",
        )

        with using_content_database(channel_id):
            files = _get_all_files(channel_id)
            total_bytes_to_download = files.aggregate(Sum('file_size'))['file_size__sum']

            with self.start_progress(total=total_bytes_to_download) as overall_progress_update:

                for f in files:
                    url = content_download_url_template.format(filename=f.get_url())
                    path = content_path_template.format(filename=f.get_url())

                    try:
                        filedir = os.path.dirname(path)
                        os.makedirs(filedir)
                    except OSError:  # directories already exist
                        pass

                    r = requests.get(url, stream=True)
                    r.raise_for_status()
                    contentlength = int(r.headers['content-length'])

                    with self.start_progress(total=contentlength) as file_dl_progress_update:

                        with open(path, "wb") as destfileobj:

                            for content in r.iter_content(1000):
                                length = len(content)

                                destfileobj.write(content)

                                overall_progress_update(length)
                                file_dl_progress_update(length)

        print("Finished downloading files.")


def _get_all_files(channel_id):
    channel = ChannelMetadata.objects.get(pk=channel_id)
    channel_root_node = ContentNode.objects.get(pk=channel.root_pk)
    all_nodes = channel_root_node.get_family()

    files = File.objects.filter(contentnode__in=all_nodes)

    return files

    # ARON TOMORROW: Implement the retrievecontent command. Accepts only 1
    # argument for now, a channel id. Downloads all the content for that
    # channel.
