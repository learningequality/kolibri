import mock
from django.apps import apps
from django.db import router
from django.db.models.signals import post_migrate
from django.test import TestCase

from ..models import LocationTypes
from ..models import NetworkLocation
from ..tasks import _refresh_reserved_locations
from ..well_known import CENTRAL_CONTENT_BASE_INSTANCE_ID
from ..well_known import DATA_PORTAL_BASE_INSTANCE_ID


class RefreshReservedLocationsTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        NetworkLocation.objects.filter(location_type=LocationTypes.Reserved).delete()

    def test_creates_studio_location(self):
        _refresh_reserved_locations()
        self.assertTrue(
            NetworkLocation.objects.filter(
                id=CENTRAL_CONTENT_BASE_INSTANCE_ID,
                location_type=LocationTypes.Reserved,
            ).exists()
        )

    def test_creates_kdp_location(self):
        _refresh_reserved_locations()
        self.assertTrue(
            NetworkLocation.objects.filter(
                id=DATA_PORTAL_BASE_INSTANCE_ID,
                location_type=LocationTypes.Reserved,
            ).exists()
        )

    def test_is_idempotent(self):
        _refresh_reserved_locations()
        _refresh_reserved_locations()
        self.assertEqual(
            NetworkLocation.objects.filter(
                location_type=LocationTypes.Reserved
            ).count(),
            2,
        )


def _send_post_migrate(config, using):
    post_migrate.send(
        sender=config,
        app_config=config,
        verbosity=0,
        interactive=False,
        using=using,
        stdout=None,
    )


class DiscoveryAppConfigTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        self.config = apps.get_app_config("discovery")
        self.using_db = router.db_for_write(NetworkLocation) or "default"

    @mock.patch("kolibri.core.discovery.tasks._refresh_reserved_locations")
    def test_post_migrate_correct_db_calls_refresh(self, mock_refresh):
        _send_post_migrate(self.config, using=self.using_db)
        mock_refresh.assert_called_once()

    @mock.patch("kolibri.core.discovery.tasks._refresh_reserved_locations")
    def test_post_migrate_wrong_db_noop(self, mock_refresh):
        # Patch the router so the handler sees a different "right" db than the
        # one the signal carries — without passing a non-existent alias to
        # post_migrate.send(), which would crash Django's built-in receivers.
        with mock.patch.object(
            router, "db_for_write", return_value="not_" + self.using_db
        ):
            _send_post_migrate(self.config, using=self.using_db)
        mock_refresh.assert_not_called()
