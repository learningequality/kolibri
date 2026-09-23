import logging
import subprocess
from urllib.parse import urlsplit
from urllib.parse import urlunparse

from gi.repository import Gio
from kolibri_app.config import DISPATCH_URI_SCHEME
from kolibri_app.config import KOLIBRI_URI_SCHEME
from kolibri_app.config import LAUNCHER_APPLICATION_ID

logger = logging.getLogger(__name__)


class Launcher(Gio.Application):
    """
    Handles kolibri-channel and x-kolibri-dispatch URIs, launching the
    kolibri-gnome application instance corresponding to the URI. Internally,
    this application starts kolibri-gnome with the specified channel ID, and a
    `kolibri:` URI corresponding to the requested content.

    Example URIs:

    - kolibri-channel://CHANNEL_ID
    - x-kolibri-dispatch://[channel_id]/[node_path][?query]
    """

    def __init__(self):
        application_id = LAUNCHER_APPLICATION_ID

        super().__init__(
            application_id=application_id,
            flags=Gio.ApplicationFlags.IS_SERVICE
            | Gio.ApplicationFlags.HANDLES_COMMAND_LINE
            | Gio.ApplicationFlags.HANDLES_OPEN,
        )

    def do_open(self, files: list, n_files: int, hint: str):
        file_uris = [f.get_uri() for f in files]

        for uri in file_uris:
            self.handle_uri(uri)

    def handle_uri(self, uri: str):
        url_tuple = urlsplit(uri)

        if url_tuple.scheme == DISPATCH_URI_SCHEME:
            channel_id = url_tuple.netloc
            node_path = url_tuple.path
            node_query = url_tuple.query
        else:
            logger.info(f"Invalid URL scheme: {uri}")
            return

        kolibri_gnome_args = []

        if channel_id and channel_id != "_":
            kolibri_gnome_args.extend(["--channel-id", channel_id])

        # Generate a `kolibri:` URI corresponding to node_path and query, if
        # specified, to open the requested content in kolibri-gnome.

        if node_path or node_query:
            kolibri_node_url = urlunparse(
                (KOLIBRI_URI_SCHEME, node_path, "", None, node_query, None)
            )
            kolibri_gnome_args.append(kolibri_node_url)

        subprocess.Popen(["kolibri-gnome", *kolibri_gnome_args])
