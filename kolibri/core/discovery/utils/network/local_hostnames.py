from kolibri.core.discovery.tasks import sync_local_hostnames
from kolibri.core.discovery.utils.network.broadcast import KolibriInstanceListener


class LocalHostnameListener(KolibriInstanceListener):
    """
    Persists the `.local` hostnames the transport owns to the database, so
    `get_urls()` can read them from any process. Attached to the transport's
    own bus, which carries the `EVENT_UPDATE_LOCAL_NAMES` events.
    """

    def update_local_names(self, hostnames):
        sync_local_hostnames.enqueue(args=(hostnames,))
