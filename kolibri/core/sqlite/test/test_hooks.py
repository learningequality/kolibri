from unittest import mock

from django.test import SimpleTestCase

from kolibri.core.sqlite.hooks import AdditionalSQLiteDatabaseRouter


class _Meta:
    def __init__(self, app_label, model_name):
        self.app_label = app_label
        self.model_name = model_name


class RoutedModel:
    _meta = _Meta("test_plugin", "routedmodel")


class UnroutedModel:
    _meta = _Meta("other_app", "unroutedmodel")


class AdditionalSQLiteDatabaseRouterTestCase(SimpleTestCase):
    def setUp(self):
        patcher = mock.patch("kolibri.core.sqlite.hooks.AdditionalSQLiteDatabaseHook")
        self.mock_hook_class = patcher.start()
        self.addCleanup(patcher.stop)

        hook = mock.MagicMock()
        hook.database_name = "test_plugin_db"
        hook.models = [RoutedModel]
        self.mock_hook_class.registered_hooks = [hook]
        self.mock_hook_class.database_names.return_value = ("test_plugin_db",)

        self.router = AdditionalSQLiteDatabaseRouter()

    def test_db_for_read_routes_registered_model(self):
        self.assertEqual(self.router.db_for_read(RoutedModel), "test_plugin_db")

    def test_db_for_read_ignores_unregistered_model(self):
        self.assertIsNone(self.router.db_for_read(UnroutedModel))

    def test_db_for_write_routes_registered_model(self):
        self.assertEqual(self.router.db_for_write(RoutedModel), "test_plugin_db")

    def test_db_for_write_ignores_unregistered_model(self):
        self.assertIsNone(self.router.db_for_write(UnroutedModel))

    def test_allow_relation_between_models_in_same_database(self):
        self.assertTrue(self.router.allow_relation(RoutedModel(), RoutedModel()))

    def test_disallow_relation_between_routed_and_unrouted_models(self):
        self.assertFalse(self.router.allow_relation(RoutedModel(), UnroutedModel()))

    def test_no_opinion_on_relation_between_unrouted_models(self):
        self.assertIsNone(self.router.allow_relation(UnroutedModel(), UnroutedModel()))

    def test_allow_migrate_routed_model_on_its_database(self):
        self.assertTrue(
            self.router.allow_migrate(
                "test_plugin_db", "test_plugin", model_name="routedmodel"
            )
        )

    def test_disallow_migrate_routed_model_on_other_database(self):
        self.assertFalse(
            self.router.allow_migrate(
                "default", "test_plugin", model_name="routedmodel"
            )
        )

    def test_disallow_migrate_unrouted_model_on_hook_database(self):
        # Other apps' models must stay out of plugin-provided databases.
        self.assertFalse(
            self.router.allow_migrate(
                "test_plugin_db", "other_app", model_name="unroutedmodel"
            )
        )

    def test_no_opinion_on_unrouted_model_on_other_database(self):
        self.assertIsNone(
            self.router.allow_migrate(
                "default", "other_app", model_name="unroutedmodel"
            )
        )
