import logging as logger
import os

from django.db.models import Sum
from kolibri.tasks.management.commands.base import AsyncCommand

from ...content_db_router import using_content_database
from ...models import File
from ...utils import paths, transfer

logging = logger.getLogger(__name__)


class Command(AsyncCommand):

    def add_arguments(self, parser):
        parser.add_argument("channel_id", type=str)
        parser.add_argument("destination", type=str)

    def handle_async(self, *args, **options):
        channel_id = options["channel_id"]
        data_dir = os.path.realpath(options["destination"])
        logging.info("Exporting content for channel id {} to {}".format(channel_id, data_dir))

        with using_content_database(channel_id):
            files = File.objects.all()
            total_bytes_to_transfer = files.aggregate(Sum('file_size'))['file_size__sum']

            with self.start_progress(total=total_bytes_to_transfer) as overall_progress_update:

                for f in files:

                    filename = f.get_filename()

                    srcpath = paths.get_content_storage_file_path(filename)
                    dest = paths.get_content_storage_file_path(filename, datafolder=data_dir)

                    # if the file already exists, add its size to our overall progress, and skip
                    if os.path.isfile(dest) and os.path.getsize(dest) == f.file_size:
                        overall_progress_update(f.file_size)
                        continue

                    with transfer.FileCopy(srcpath, dest) as copy:

                        with self.start_progress(total=copy.total_size) as file_cp_progress_update:

                            for chunk in copy:
                                length = len(chunk)
                                overall_progress_update(length)
                                file_cp_progress_update(length)
