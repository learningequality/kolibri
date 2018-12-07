import io
import zipfile

import requests
from clint.textui.progress import Bar as ProgressBar
from django.conf import settings
from django.core.management.base import BaseCommand
from requests_toolbelt import MultipartEncoder
from requests_toolbelt import MultipartEncoderMonitor

DB_PATH = settings.DATABASES["default"]["NAME"]

CENTRAL_SERVER_DB_UPLOAD_URL = "http://kolibridataupload.learningequality.org/upload/"


def create_callback(encoder):
    encoder_len = encoder.len
    bar = ProgressBar(expected_size=encoder_len, filled_char="=")

    def callback(monitor):
        bar.show(monitor.bytes_read)

    return callback


class Command(BaseCommand):
    help = "Uploads the local database to a central server for backup and reporting"

    def add_arguments(self, parser):
        parser.add_argument('project', action='store',
                            help='Name of the project (single word) with which this data should be associated.')

    def handle(self, *args, **options):

        self.stdout.write("Uploading database to central server...\n")

        buff = io.BytesIO()

        zip_archive = zipfile.ZipFile(buff, mode='w', compression=zipfile.ZIP_DEFLATED)

        zip_archive.write(DB_PATH, "db.sqlite3")

        zip_archive.close()

        encoder = MultipartEncoder({
            "project": options['project'],
            "file": ("db.sqlite3.zip", buff, "application/octet-stream")
        })
        monitor = MultipartEncoderMonitor(encoder, create_callback(encoder))
        r = requests.post(CENTRAL_SERVER_DB_UPLOAD_URL, data=monitor, headers={"Content-Type": monitor.content_type})
        print("\nUpload finished! (Returned status {0} {1})".format(r.status_code, r.reason))
