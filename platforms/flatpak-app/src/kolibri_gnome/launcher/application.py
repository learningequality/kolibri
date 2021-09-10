import logging

logger = logging.getLogger(__name__)

import gi
import subprocess

from urllib.parse import urlsplit
from gi.repository import Gio

from .. import config


class Launcher(Gio.Application):
    def __init__(self):
        application_id = config.LAUNCHER_APPLICATION_ID

        super().__init__(application_id=application_id,
                         flags=Gio.ApplicationFlags.IS_SERVICE |
                         Gio.ApplicationFlags.HANDLES_COMMAND_LINE |
                         Gio.ApplicationFlags.HANDLES_OPEN)

    def do_open(self, files, n_files, hint):
        file_uris = [f.get_uri() for f in files]

        for uri in file_uris:
            self.handle_uri(uri)

    def handle_uri(self, uri):
        valid_url_schemes = ("kolibri-channel", )

        url_tuple = urlsplit(uri)
        if url_tuple.scheme not in valid_url_schemes:
            logger.info(f"Invalid URL scheme: {uri}")
            return

        channel_id = url_tuple.path
        subprocess.Popen(["kolibri-gnome", "--channel-id", channel_id])
