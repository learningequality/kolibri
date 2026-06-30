from django.apps import AppConfig
from django.db.models.signals import post_migrate


def _seed_reserved_locations(sender, **kwargs):
    from django.db import router

    from kolibri.core.discovery.models import NetworkLocation

    using = kwargs.get("using", "default")
    if (router.db_for_write(NetworkLocation) or "default") != using:
        return
    from kolibri.core.discovery.tasks import _refresh_reserved_locations

    _refresh_reserved_locations()


class DiscoveryConfig(AppConfig):
    name = "kolibri.core.discovery"
    label = "discovery"
    verbose_name = "Kolibri Discovery"

    def ready(self):
        post_migrate.connect(
            _seed_reserved_locations,
            sender=self,
            dispatch_uid="discovery_seed_reserved_locations",
        )
