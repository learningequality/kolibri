from kolibri.core.discovery.tasks import sync_local_hostnames
from kolibri.core.discovery.utils.network.broadcast import KolibriInstanceListener


class LocalHostnameListener(KolibriInstanceListener):
    """
    Persists the `.local` hostnames the broadcast owns to the database, so
    `get_urls()` can read them from any process.
    """

    def update_local_names(self, hostnames):
        sync_local_hostnames.enqueue(args=(hostnames,))
