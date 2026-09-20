import copy
import logging
import unittest
import uuid
from contextlib import contextmanager
from unittest.mock import MagicMock
from unittest.mock import patch

from django.conf import settings
from django.db import connection
from django.db import connections
from django.db import IntegrityError
from django.db.migrations.loader import MigrationLoader
from django.db.migrations.recorder import MigrationRecorder
from django.db.utils import OperationalError
from django.test import SimpleTestCase
from django.test import TestCase
from django.test import TransactionTestCase
from django.test.utils import CaptureQueriesContext

import kolibri
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ContentDownloadRequest
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import ContentRequest
from kolibri.core.content.models import ContentRequestReason
from kolibri.core.content.models import ContentRequestStatus
from kolibri.core.content.models import Language
from kolibri.core.content.models import LocalFile
from kolibri.core.device.models import DeviceSettings
from kolibri.core.device.models import DeviceStatus
from kolibri.core.device.models import LearnerDeviceStatus
from kolibri.core.device.models import OSUser
from kolibri.core.device.models import UserSyncStatus
from kolibri.core.device.utils import LANDING_PAGE_LEARN
from kolibri.core.device.utils import LANDING_PAGE_SIGN_IN
from kolibri.core.discovery.models import PinnedDevice
from kolibri.core.notifications.models import LearnerProgressNotification
from kolibri.core.test.test_app.models import Membership
from kolibri.core.utils import schema_drift
from kolibri.core.utils.schema_drift import _find_schema_drift
from kolibri.core.utils.schema_drift import _repair_database
from kolibri.core.utils.schema_drift import _repair_database_quick_check
from kolibri.core.utils.schema_drift import repair_schema_drift
from kolibri.core.utils.schema_drift import repair_schema_drift_quick_check
from kolibri.utils import main


def _messages(logs, level=logging.ERROR):
    return [record.getMessage() for record in logs.records if record.levelno == level]


class SchemaDriftVendorTestCase(TestCase):
    def _captured_sql(self, captured):
        return [query["sql"] for query in captured.captured_queries]

    def test_does_nothing_on_a_non_sqlite_database(self):
        with patch.object(connection, "vendor", "postgresql"):
            with CaptureQueriesContext(connection) as captured:
                repair_schema_drift()

        self.assertEqual(self._captured_sql(captured), [])

    def test_checks_nothing_on_a_non_sqlite_database(self):
        with patch.object(connection, "vendor", "postgresql"):
            with CaptureQueriesContext(connection) as captured:
                repair_schema_drift_quick_check()

        self.assertEqual(self._captured_sql(captured), [])


class ConnectionToRepairTestCase(SimpleTestCase):
    def _connections(self, **attributes):
        return {
            alias: MagicMock(vendor="sqlite", **attributes)
            for alias in settings.DATABASES
        }

    def _assert_failure_logged_per_database(self, logs):
        messages = _messages(logs)
        self.assertEqual(len(messages), len(settings.DATABASES), messages)
        for alias, message in zip(settings.DATABASES, messages):
            self.assertEqual(
                message, f"Could not repair schema drift on database {alias}"
            )

    @patch.object(schema_drift, "_repair_database")
    def test_closes_the_connections_it_opened(self, repair):
        connections = self._connections(connection=None)

        with patch.object(schema_drift, "connections", connections):
            repair_schema_drift()

        for opened in connections.values():
            opened.close.assert_called_once_with()

    @patch.object(schema_drift, "_repair_database")
    def test_leaves_already_open_connections_open(self, repair):
        connections = self._connections()

        with patch.object(schema_drift, "connections", connections):
            repair_schema_drift()

        for opened in connections.values():
            opened.close.assert_not_called()

    @patch.object(schema_drift, "_repair_database", side_effect=Exception("boom"))
    def test_contains_a_failure_and_carries_on_to_the_next_database(self, repair):
        connections = self._connections(connection=None)

        with patch.object(schema_drift, "connections", connections):
            with self.assertLogs(schema_drift.logger, "ERROR") as logs:
                repair_schema_drift()

        self.assertEqual(repair.call_count, len(settings.DATABASES))
        self._assert_failure_logged_per_database(logs)
        for opened in connections.values():
            opened.close.assert_called_once_with()

    @patch.object(schema_drift, "_repair_database")
    def test_contains_a_failure_to_close_a_connection(self, repair):
        connections = self._connections(connection=None)
        for opened in connections.values():
            opened.close.side_effect = OperationalError("unable to close")

        with patch.object(schema_drift, "connections", connections):
            with self.assertLogs(schema_drift.logger, "ERROR") as logs:
                repair_schema_drift()

        self._assert_failure_logged_per_database(logs)


@unittest.skipUnless(
    connection.vendor == "sqlite",
    "the damage these tests induce is a SQLite table rebuild, and the repair runs on no other backend",
)
class SchemaDriftTestCase(TransactionTestCase):
    databases = "__all__"

    @contextmanager
    def _damaged_schema(self, damage, restore):
        with connection.schema_editor() as editor:
            damage(editor)
        try:
            yield
        finally:
            with connection.schema_editor() as editor:
                restore(editor)

    @contextmanager
    def _repairable(self, model, damage, restore):
        with connection.schema_editor() as editor:
            damage(editor)
        try:
            yield
        finally:
            label = model._meta.label
            unrepaired = [
                drift
                for drift in _find_schema_drift(connection)
                if drift.model._meta.label == label
            ]
            if unrepaired:
                with connection.schema_editor() as editor:
                    restore(editor)

    def _removed_field(self, model, field_name):
        field = model._meta.get_field(field_name)
        return self._damaged_schema(
            lambda editor: editor.remove_field(model, field),
            lambda editor: editor.add_field(model, field),
        )

    def _stale_rebuild(
        self, model, drop=(), loosen=(), drop_unique=(), drop_unique_together=False
    ):
        # _remake_table renders its model from the same bases, so fields inherited from
        # an abstract base come back even when dropped here
        dropped = [model._meta.get_field(name) for name in drop]
        remaining = []
        for field in model._meta.local_concrete_fields:
            if field in dropped:
                continue
            if field.name in loosen or field.name in drop_unique:
                field = copy.deepcopy(field)
            if field.name in loosen:
                field.null = True
            if field.name in drop_unique:
                # unique is a read-only property over _unique
                field._unique = False
            remaining.append(field)
        unique_together = () if drop_unique_together else model._meta.unique_together

        def damage(editor):
            with patch.object(model._meta, "local_concrete_fields", remaining):
                with patch.object(model._meta, "unique_together", unique_together):
                    editor._remake_table(model)

        def restore(editor):
            editor.delete_model(model)
            editor.create_model(model)

        return self._damaged_schema(damage, restore)

    def _dropped_unique_together(self, model):
        field_names = model._meta.unique_together[0]
        return self._repairable(
            model,
            lambda editor: editor.alter_unique_together(model, [field_names], []),
            lambda editor: editor.alter_unique_together(model, [], [field_names]),
        )

    def _altered_nullability(self, model, field_name, null):
        field = model._meta.get_field(field_name)
        altered = copy.deepcopy(field)
        altered.null = null
        return self._repairable(
            model,
            lambda editor: editor.alter_field(model, field, altered),
            lambda editor: editor.alter_field(model, altered, field),
        )

    @contextmanager
    def _extra_column(self, model, column):
        table = model._meta.db_table
        with connection.cursor() as cursor:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} varchar(32)")
        try:
            yield
        finally:
            with connection.schema_editor() as editor:
                editor.delete_model(model)
                editor.create_model(model)

    @contextmanager
    def _duplicate_migration_record(self):
        # django_migrations has no unique constraint over (app, name)
        recorder = MigrationRecorder(connection)
        app, name = MigrationLoader(connection).graph.leaf_nodes()[0]
        recorder.record_applied(app, name)
        try:
            yield (app, name)
        finally:
            recorded = recorder.migration_qs.filter(app=app, name=name)
            recorded.exclude(pk=recorded.first().pk).delete()

    def _user(self):
        facility = Facility.objects.create(name="Test Facility")
        return FacilityUser.objects.create(username="learner", facility=facility)

    def _constraints(self, model):
        with connection.cursor() as cursor:
            return connection.introspection.get_constraints(
                cursor, model._meta.db_table
            )

    def _has_index(self, model, field_names):
        columns = [model._meta.get_field(name).column for name in field_names]
        return any(
            info["index"] and list(info["columns"]) == columns
            for info in self._constraints(model).values()
        )

    def _has_unique_constraint(self, model, field_names):
        columns = [model._meta.get_field(name).column for name in field_names]
        return any(
            info["unique"] and list(info["columns"]) == columns
            for info in self._constraints(model).values()
        )

    def _stored_landing_page(self, pk):
        return (
            DeviceSettings.objects.filter(pk=pk)
            .values_list("landing_page", flat=True)
            .first()
        )

    def _physical_rows(self, model):
        table = model._meta.db_table
        with connection.cursor() as cursor:
            columns = [
                info.name
                for info in connection.introspection.get_table_description(
                    cursor, table
                )
            ]
            cursor.execute("SELECT {} FROM {}".format(", ".join(columns), table))
            rows = cursor.fetchall()
        pk = columns.index(model._meta.pk.column)
        return {row[pk]: dict(zip(columns, row)) for row in rows}

    def _recorded_migrations(self):
        return list(
            MigrationRecorder(connection).migration_qs.values_list("app", "name")
        )

    @contextmanager
    def _assert_nothing_logged(self, level):
        with self.assertLogs(schema_drift.logger, level) as logs:
            yield
            schema_drift.logger.log(level, "sentinel")
        self.assertEqual([record.getMessage() for record in logs.records], ["sentinel"])

    def _assert_rebuild_blocked_rather_than_failed(self, logs, table, blocker):
        messages = _messages(logs)
        blocked = [message for message in messages if "Cannot rebuild table" in message]
        self.assertEqual(len(blocked), 1, messages)
        self.assertIn(table, blocked[0])
        self.assertIn(blocker, blocked[0])
        failed = [
            message
            for message in messages
            if "Could not repair the schema of" in message
        ]
        self.assertEqual(failed, [])

    def test_no_drift_on_any_migrated_database(self):
        for alias in settings.DATABASES:
            with self._assert_nothing_logged(logging.WARNING):
                drifts = _find_schema_drift(connections[alias])

            self.assertEqual(drifts, [], alias)

    def test_ignores_models_routed_to_another_database(self):
        table = LearnerProgressNotification._meta.db_table
        self.assertNotIn(table, connection.introspection.table_names())

        with self._assert_nothing_logged(logging.ERROR):
            drifts = _find_schema_drift(connection)

        self.assertEqual(drifts, [])

    def test_ignores_models_of_apps_without_migrations(self):
        loader = MigrationLoader(connection)
        self.assertIn(Membership._meta.app_label, loader.unmigrated_apps)
        self.assertIn(Membership._meta.db_table, connection.introspection.table_names())

        with self._assert_nothing_logged(logging.WARNING):
            drifts = _find_schema_drift(connection)

        self.assertEqual(drifts, [])

    def test_ignores_a_legacy_column_awaiting_its_upgrade(self):
        with self._extra_column(LocalFile, "file_size"):
            with self._assert_nothing_logged(logging.WARNING):
                _repair_database(connection)

            self.assertEqual(_find_schema_drift(connection), [])

    def test_reports_an_unrelated_column_beside_a_legacy_column(self):
        with self._extra_column(LocalFile, "file_size"):
            with self._extra_column(LocalFile, "leftover"):
                with self.assertLogs(schema_drift.logger, "ERROR") as logs:
                    _repair_database(connection)

        messages = _messages(logs)
        self.assertEqual(len(messages), 1, messages)
        self.assertIn("leftover", messages[0])
        self.assertNotIn("file_size", messages[0])

    def test_keeps_a_legacy_column_awaiting_its_upgrade_through_a_repair(self):
        table = LocalFile._meta.db_table
        with self._stale_rebuild(LocalFile, loosen=["available"]):
            LocalFile.objects.create(id="a" * 32, extension="mp4")
            with self._extra_column(LocalFile, "file_size"):
                with connection.cursor() as cursor:
                    cursor.execute(f"UPDATE {table} SET file_size = '2000000000'")

                _repair_database(connection)

                with connection.cursor() as cursor:
                    cursor.execute(f"SELECT file_size FROM {table}")
                    self.assertEqual(cursor.fetchall(), [("2000000000",)])

    def test_returns_nothing_when_migrations_are_pending(self):
        recorder = MigrationRecorder(connection)
        app, name = MigrationLoader(connection).graph.leaf_nodes()[0]
        with self._removed_field(DeviceSettings, "language_id"):
            recorder.migration_qs.filter(app=app, name=name).delete()
            try:
                self.assertEqual(_find_schema_drift(connection), [])
            finally:
                recorder.record_applied(app, name)

    def test_makes_no_changes_to_a_healthy_database(self):
        with CaptureQueriesContext(connection) as captured:
            _repair_database(connection)

        for query in captured.captured_queries:
            sql = query["sql"].lstrip().upper()
            # a SQLite PRAGMA writes only when given "=", and opening a schema editor
            # writes PRAGMA foreign_keys
            self.assertTrue(
                sql.startswith(("SELECT", "BEGIN", "COMMIT", "ROLLBACK"))
                or (sql.startswith("PRAGMA") and "=" not in sql),
                query["sql"],
            )

    def test_reports_a_missing_table_without_repairing_it(self):
        table = PinnedDevice._meta.db_table
        with self._damaged_schema(
            lambda editor: editor.delete_model(PinnedDevice),
            lambda editor: editor.create_model(PinnedDevice),
        ):
            with self.assertLogs(schema_drift.logger, "ERROR") as logs:
                _repair_database(connection)

            self.assertNotIn(table, connection.introspection.table_names())
            messages = _messages(logs)
            self.assertEqual(len(messages), 1, messages)
            self.assertIn(table, messages[0])
            self.assertIn(PinnedDevice._meta.label, messages[0])

    def test_reports_a_column_the_migration_state_does_not_have(self):
        DeviceSettings.objects.create()
        table = DeviceSettings._meta.db_table

        with self._altered_nullability(DeviceSettings, "landing_page", True):
            with self._extra_column(DeviceSettings, "leftover"):
                with connection.cursor() as cursor:
                    cursor.execute(f"UPDATE {table} SET leftover = 'keep me'")

                with self.assertLogs(schema_drift.logger, "ERROR") as logs:
                    _repair_database(connection)

                messages = _messages(logs)
                self.assertTrue(
                    any(
                        "holds columns" in message and "leftover" in message
                        for message in messages
                    ),
                    messages,
                )
                self._assert_rebuild_blocked_rather_than_failed(logs, table, "leftover")
                DeviceSettings.objects.all().update(landing_page=None)
                with connection.cursor() as cursor:
                    cursor.execute(f"SELECT leftover FROM {table}")
                    self.assertEqual(cursor.fetchone()[0], "keep me")

    def test_reports_and_keeps_an_index_the_migration_state_does_not_have(self):
        table = OSUser._meta.db_table
        with connection.cursor() as cursor:
            cursor.execute(
                f"CREATE INDEX leftover_idx ON {table} (os_username, user_id)"
            )
        try:
            with self.assertLogs(schema_drift.logger, "WARNING") as logs:
                _repair_database(connection)

            messages = _messages(logs, logging.WARNING)
            self.assertTrue(
                any("os_username" in message for message in messages), messages
            )
            self.assertTrue(self._has_index(OSUser, ["os_username", "user"]))
        finally:
            with connection.cursor() as cursor:
                cursor.execute("DROP INDEX leftover_idx")

    def test_repairs_a_missing_nullable_column(self):
        with self._stale_rebuild(DeviceSettings, drop=["language_id"]):
            with self.assertRaises(OperationalError):
                DeviceSettings.objects.create()

            _repair_database(connection)

            device_settings = DeviceSettings.objects.create(language_id="en")
            self.assertEqual(
                DeviceSettings.objects.filter(pk=device_settings.pk)
                .values_list("language_id", flat=True)
                .first(),
                "en",
            )

    def test_repairs_two_missing_columns_on_one_model(self):
        with self._stale_rebuild(DeviceSettings, drop=["language_id", "landing_page"]):
            _repair_database(connection)

            device_settings = DeviceSettings.objects.create(
                language_id="en", landing_page=LANDING_PAGE_LEARN
            )
            self.assertEqual(
                self._stored_landing_page(device_settings.pk), LANDING_PAGE_LEARN
            )

    def test_repairs_a_missing_not_null_column_and_backfills_existing_rows(self):
        device_settings = DeviceSettings.objects.create()
        DeviceSettings.objects.filter(pk=device_settings.pk).update(
            landing_page=LANDING_PAGE_LEARN
        )

        with self._stale_rebuild(DeviceSettings, drop=["landing_page"]):
            _repair_database(connection)

            self.assertEqual(
                self._stored_landing_page(device_settings.pk), LANDING_PAGE_SIGN_IN
            )
            with self.assertRaises(IntegrityError):
                DeviceSettings.objects.filter(pk=device_settings.pk).update(
                    landing_page=None
                )

    def test_repairs_a_missing_foreign_key_column(self):
        facility = Facility.objects.create(name="Test Facility")

        with self._stale_rebuild(DeviceSettings, drop=["default_facility"]):
            _repair_database(connection)

            device_settings = DeviceSettings.objects.create(default_facility=facility)
            with self.assertRaises(IntegrityError):
                DeviceSettings.objects.filter(pk=device_settings.pk).update(
                    default_facility_id=uuid.uuid4().hex
                )

    def test_repairs_a_missing_column_carrying_an_index(self):
        with self._stale_rebuild(OSUser, drop=["os_username"]):
            _repair_database(connection)

            user = self._user()
            OSUser.objects.create(user=user, os_username="learner")
            self.assertTrue(self._has_index(OSUser, ["os_username"]))

    def test_repairs_a_missing_column_carrying_a_unique_constraint(self):
        user = self._user()
        with self._stale_rebuild(
            LearnerDeviceStatus, drop=["user"], drop_unique_together=True
        ):
            _repair_database(connection)

            LearnerDeviceStatus.save_learner_status(
                user.id, DeviceStatus.InsufficientStorage
            )
            self.assertTrue(
                self._has_unique_constraint(
                    LearnerDeviceStatus, LearnerDeviceStatus._meta.unique_together[0]
                )
            )

    def test_repairs_a_missing_auto_now_add_column_backfilling_existing_rows(self):
        user = self._user()
        LearnerDeviceStatus.save_learner_status(
            user.id, DeviceStatus.InsufficientStorage
        )

        with self._stale_rebuild(LearnerDeviceStatus, drop=["created_at"]):
            _repair_database(connection)

            created_at = list(
                LearnerDeviceStatus.objects.values_list("created_at", flat=True)
            )

        self.assertEqual(len(created_at), 1)
        self.assertIsNotNone(created_at[0])

    def test_restores_nullable_columns_as_null_and_backfills_not_null_columns(self):
        facility = Facility.objects.create(name="Test Facility")
        for source_model in ("first", "second", "third"):
            ContentDownloadRequest.objects.create(
                facility=facility,
                source_model=source_model,
                source_id=uuid.uuid4().hex,
                contentnode_id=uuid.uuid4().hex,
                reason=ContentRequestReason.UserInitiated,
                status=ContentRequestStatus.Pending,
            )
        before = self._physical_rows(ContentRequest)
        restored = ("priority", "requested_at")

        with self._stale_rebuild(ContentRequest, drop=list(restored)):
            _repair_database(connection)
            after = self._physical_rows(ContentRequest)

        self.assertEqual(sorted(after), sorted(before))
        for pk, row in after.items():
            self.assertEqual(
                {c: v for c, v in row.items() if c not in restored},
                {c: v for c, v in before[pk].items() if c not in restored},
            )
            self.assertIsNone(row["priority"])
        backfilled = {row["requested_at"] for row in after.values()}
        self.assertEqual(len(backfilled), 1)
        self.assertNotIn(
            backfilled.pop(), {row["requested_at"] for row in before.values()}
        )

    def test_logs_the_start_and_finish_of_each_model_repair_as_it_happens(self):
        index = ContentNode._meta.indexes[0]
        columns_only = DeviceSettings._meta.label
        both_passes = OSUser._meta.label
        table_only = ContentNode._meta.label

        with self._stale_rebuild(DeviceSettings, drop=["language_id"]):
            with self._stale_rebuild(OSUser, drop=["os_username"]):
                with self._repairable(
                    ContentNode,
                    lambda editor: editor.remove_index(ContentNode, index),
                    lambda editor: editor.add_index(ContentNode, index),
                ):
                    with self.assertLogs(schema_drift.logger, "INFO") as logs:
                        _repair_database(connection)

                    self.assertEqual(_find_schema_drift(connection), [])

        messages = _messages(logs, logging.INFO)

        def position(prefix, label):
            matching = [
                i
                for i, message in enumerate(messages)
                if message.startswith(f"{prefix} the schema of {label}")
            ]
            self.assertEqual(len(matching), 1, messages)
            return matching[0]

        for label in (columns_only, both_passes, table_only):
            self.assertLess(
                position("Repairing", label), position("Repaired", label), messages
            )
        self.assertLess(
            position("Repaired", columns_only),
            position("Repairing", table_only),
            messages,
        )

    def test_repairs_a_missing_meta_index(self):
        index = ContentNode._meta.indexes[0]
        with self._repairable(
            ContentNode,
            lambda editor: editor.remove_index(ContentNode, index),
            lambda editor: editor.add_index(ContentNode, index),
        ):
            self.assertFalse(self._has_index(ContentNode, index.fields))

            _repair_database(connection)

            self.assertTrue(self._has_index(ContentNode, index.fields))

    def test_repairs_a_missing_index_together(self):
        field_names = ContentNode._meta.index_together[0]
        with self._repairable(
            ContentNode,
            lambda editor: editor.alter_index_together(ContentNode, [field_names], []),
            lambda editor: editor.alter_index_together(ContentNode, [], [field_names]),
        ):
            self.assertFalse(self._has_index(ContentNode, field_names))

            _repair_database(connection)

            self.assertTrue(self._has_index(ContentNode, field_names))

    def test_repairs_a_missing_field_index(self):
        indexed = OSUser._meta.get_field("os_username")
        not_indexed = copy.deepcopy(indexed)
        not_indexed.db_index = False
        with self._repairable(
            OSUser,
            lambda editor: editor.alter_field(OSUser, indexed, not_indexed),
            lambda editor: editor.alter_field(OSUser, not_indexed, indexed),
        ):
            self.assertFalse(self._has_index(OSUser, ["os_username"]))

            _repair_database(connection)

            self.assertTrue(self._has_index(OSUser, ["os_username"]))

    def test_repairs_a_missing_unique_together(self):
        user = self._user()
        instance_id = uuid.uuid4().hex

        with self._dropped_unique_together(PinnedDevice):
            PinnedDevice.objects.create(user=user, instance_id=instance_id)
            PinnedDevice.objects.create(user=user, instance_id=instance_id).delete()

            _repair_database(connection)

            with self.assertRaises(IntegrityError):
                PinnedDevice.objects.create(user=user, instance_id=instance_id)

    def test_repairs_a_missing_unique_together_on_an_m2m_through_table(self):
        through = ContentNode._meta.get_field("tags").remote_field.through
        unique_together = through._meta.unique_together[0]

        with self._dropped_unique_together(through):
            self.assertFalse(self._has_unique_constraint(through, unique_together))

            _repair_database(connection)

            self.assertTrue(self._has_unique_constraint(through, unique_together))

    def test_repairs_a_missing_unique_field(self):
        user = self._user()

        with self._stale_rebuild(UserSyncStatus, drop_unique=["user"]):
            UserSyncStatus.objects.create(user=user)

            _repair_database(connection)

            with self.assertRaises(IntegrityError):
                UserSyncStatus.objects.create(user=user)

    def test_repairs_what_it_can_when_a_rebuild_is_refused(self):
        user = self._user()
        instance_id = uuid.uuid4().hex

        with self._stale_rebuild(
            PinnedDevice, loosen=["instance_id"], drop_unique_together=True
        ):
            with self._extra_column(PinnedDevice, "leftover"):
                with self.assertLogs(schema_drift.logger, "ERROR") as logs:
                    _repair_database(connection)

                self._assert_rebuild_blocked_rather_than_failed(
                    logs, PinnedDevice._meta.db_table, "leftover"
                )
                pinned = PinnedDevice.objects.create(user=user, instance_id=instance_id)
                rows = PinnedDevice.objects.filter(pk=pinned.pk)
                rows.update(instance_id=None)
                rows.update(instance_id=instance_id)
                with self.assertRaises(IntegrityError):
                    PinnedDevice.objects.create(user=user, instance_id=instance_id)

    def test_leaves_a_violated_unique_together_for_the_operator_to_resolve(self):
        user = self._user()
        instance_id = uuid.uuid4().hex

        with self._dropped_unique_together(PinnedDevice):
            PinnedDevice.objects.create(user=user, instance_id=instance_id)
            duplicate = PinnedDevice.objects.create(user=user, instance_id=instance_id)
            try:
                with self.assertLogs(schema_drift.logger, "ERROR") as logs:
                    _repair_database(connection)

                self.assertTrue(_find_schema_drift(connection))
                messages = _messages(logs)
                self.assertEqual(len(messages), 1, messages)
                self.assertIn(PinnedDevice._meta.label, messages[0])
                self.assertIn("instance_id", messages[0])
                self.assertIn("2 rows are duplicates", messages[0])

                duplicate.delete()
                _repair_database(connection)

                with self.assertRaises(IntegrityError):
                    PinnedDevice.objects.create(user=user, instance_id=instance_id)
            finally:
                PinnedDevice.objects.all().delete()

    def test_refuses_a_rebuild_that_would_restore_a_unique_constraint_over_duplicates(
        self,
    ):
        user = self._user()
        instance_id = uuid.uuid4().hex
        unique_together = PinnedDevice._meta.unique_together[0]

        with self._stale_rebuild(
            PinnedDevice, loosen=["created"], drop_unique_together=True
        ):
            PinnedDevice.objects.create(user=user, instance_id=instance_id)
            PinnedDevice.objects.create(user=user, instance_id=instance_id)
            before = self._physical_rows(PinnedDevice)

            with self.assertLogs(schema_drift.logger, "ERROR") as logs:
                _repair_database(connection)

            self._assert_rebuild_blocked_rather_than_failed(
                logs,
                PinnedDevice._meta.db_table,
                "2 rows are duplicates over (user_id, instance_id)",
            )
            self.assertEqual(self._physical_rows(PinnedDevice), before)
            self.assertFalse(self._has_unique_constraint(PinnedDevice, unique_together))
            PinnedDevice.objects.all().update(created=None)

    def test_repairs_a_column_loosened_to_nullable(self):
        device_settings = DeviceSettings.objects.create()
        rows = DeviceSettings.objects.filter(pk=device_settings.pk)

        with self._altered_nullability(DeviceSettings, "landing_page", True):
            rows.update(landing_page=None)

            _repair_database(connection)

            self.assertEqual(
                self._stored_landing_page(device_settings.pk), LANDING_PAGE_SIGN_IN
            )
            with self.assertRaises(IntegrityError):
                rows.update(landing_page=None)

    def test_repairs_a_column_tightened_to_not_null(self):
        with self._altered_nullability(DeviceSettings, "language_id", False):
            device_settings = DeviceSettings.objects.create(language_id="en")
            rows = DeviceSettings.objects.filter(pk=device_settings.pk)
            with self.assertRaises(IntegrityError):
                rows.update(language_id=None)

            _repair_database(connection)

            rows.update(language_id=None)
            self.assertIsNone(rows.values_list("language_id", flat=True).first())

    def test_writes_nothing_when_a_rebuild_is_refused(self):
        device_settings = DeviceSettings.objects.create()

        with self._altered_nullability(DeviceSettings, "landing_page", True):
            DeviceSettings.objects.filter(pk=device_settings.pk).update(
                landing_page=None
            )
            with self._extra_column(DeviceSettings, "leftover"):
                with self.assertLogs(schema_drift.logger, "ERROR") as logs:
                    _repair_database(connection)

                self._assert_rebuild_blocked_rather_than_failed(
                    logs, DeviceSettings._meta.db_table, "leftover"
                )
                self.assertIsNone(self._stored_landing_page(device_settings.pk))

    def test_leaves_unfillable_nulls_for_the_operator_to_resolve(self):
        with self._stale_rebuild(Language, loosen=["lang_code", "lang_direction"]):
            Language.objects.create(id="xx", lang_code="xx")
            Language.objects.filter(pk="xx").update(lang_code=None)
            try:
                with self.assertLogs(schema_drift.logger, "ERROR") as logs:
                    _repair_database(connection)

                messages = _messages(logs)
                self.assertTrue(
                    any("1 rows hold NULL" in message for message in messages), messages
                )
                self._assert_rebuild_blocked_rather_than_failed(
                    logs, Language._meta.db_table, "NULL in lang_code"
                )
                Language.objects.filter(pk="xx").update(lang_direction=None)
                self.assertTrue(_find_schema_drift(connection))

                Language.objects.filter(pk="xx").delete()
                _repair_database(connection)

                language = Language.objects.create(id="yy", lang_code="yy")
                with self.assertRaises(IntegrityError):
                    Language.objects.filter(pk=language.pk).update(lang_direction=None)
                self.assertEqual(_find_schema_drift(connection), [])
            finally:
                Language.objects.all().delete()

    def test_checks_nothing_without_the_fingerprint_of_a_concurrent_migration(self):
        with self._stale_rebuild(DeviceSettings, drop=["language_id"]):
            with CaptureQueriesContext(connection) as captured:
                _repair_database_quick_check(connection)

            self.assertTrue(_find_schema_drift(connection))
            self.assertEqual(len(captured.captured_queries), 2)
            self.assertNotIn(
                DeviceSettings._meta.db_table,
                " ".join(query["sql"] for query in captured.captured_queries),
            )

    def test_repairs_a_database_that_was_migrated_concurrently(self):
        with self._stale_rebuild(DeviceSettings, drop=["language_id"]):
            with self._duplicate_migration_record():
                _repair_database_quick_check(connection)

            self.assertEqual(_find_schema_drift(connection), [])
            DeviceSettings.objects.create(language_id="en")

    def test_reconciles_duplicate_migration_records_once_nothing_needs_repairing(self):
        with self._duplicate_migration_record():
            recorded = self._recorded_migrations()

            _repair_database(connection)

            reconciled = self._recorded_migrations()

        self.assertEqual(len(reconciled), len(recorded) - 1)
        self.assertEqual(sorted(set(reconciled)), sorted(set(recorded)))
        self.assertEqual(len(reconciled), len(set(reconciled)))

    def test_keeps_duplicate_migration_records_until_a_later_sweep_finds_no_drift(self):
        with self._stale_rebuild(DeviceSettings, drop=["language_id"]):
            with self._duplicate_migration_record():
                _repair_database(connection)
                self.assertEqual(_find_schema_drift(connection), [])
                repaired = self._recorded_migrations()

                _repair_database(connection)
                reconciled = self._recorded_migrations()

        self.assertEqual(len(repaired), len(set(repaired)) + 1)
        self.assertEqual(len(reconciled), len(set(reconciled)))

    def test_keeps_duplicate_migration_records_while_migrations_are_unapplied(self):
        recorder = MigrationRecorder(connection)
        with self._duplicate_migration_record() as duplicated:
            app, name = next(
                node
                for node in MigrationLoader(connection).graph.leaf_nodes()
                if node != duplicated
            )
            recorder.migration_qs.filter(app=app, name=name).delete()
            try:
                _repair_database(connection)
                recorded = self._recorded_migrations()
            finally:
                recorder.record_applied(app, name)

        self.assertEqual(len(recorded), len(set(recorded)) + 1)

    def test_startup_repairs_a_damaged_database(self):
        with self._stale_rebuild(
            DeviceSettings, drop=["language_id"], loosen=["landing_page"]
        ):
            with patch.object(main, "call_command"):
                with self.assertLogs(schema_drift.logger, "INFO") as logs:
                    main._migrate_databases()

            self.assertEqual(_messages(logs), [])
            self.assertEqual(_find_schema_drift(connection), [])

            device_settings = DeviceSettings.objects.create(language_id="en")
            with self.assertRaises(IntegrityError):
                DeviceSettings.objects.filter(pk=device_settings.pk).update(
                    landing_page=None
                )

    def test_startup_repairs_a_damaged_database_without_an_upgrade(self):
        with self._stale_rebuild(
            DeviceSettings, drop=["language_id"], loosen=["landing_page"]
        ):
            with self._duplicate_migration_record():
                with patch.object(main, "run_plugin_updates"):
                    with patch.object(main, "check_django_stack_ready"):
                        with patch.object(main, "_upgrades_after_django_setup"):
                            main._run_updates(False, kolibri.__version__)

            self.assertEqual(_find_schema_drift(connection), [])

            device_settings = DeviceSettings.objects.create(language_id="en")
            with self.assertRaises(IntegrityError):
                DeviceSettings.objects.filter(pk=device_settings.pk).update(
                    landing_page=None
                )

    def test_repairs_a_secondary_database(self):
        notifications = connections["notifications"]
        field = LearnerProgressNotification._meta.get_field("quiz_num_correct")
        with notifications.schema_editor() as editor:
            editor.remove_field(LearnerProgressNotification, field)
        try:
            self.assertTrue(_find_schema_drift(notifications))

            _repair_database(notifications)

            self.assertEqual(_find_schema_drift(notifications), [])
            notification = LearnerProgressNotification.objects.create(
                user_id=uuid.uuid4().hex, classroom_id=uuid.uuid4().hex
            )
            self.assertIsNone(
                LearnerProgressNotification.objects.filter(pk=notification.pk)
                .values_list("quiz_num_correct", flat=True)
                .first()
            )
        finally:
            if _find_schema_drift(notifications):
                with notifications.schema_editor() as editor:
                    editor.add_field(LearnerProgressNotification, field)

    def test_repairs_nothing_while_a_referenced_table_is_missing(self):
        # SQLite reports every row referencing a dropped table as a foreign key
        # violation, and the schema editor checks the whole database on exit
        user = self._user()
        LearnerDeviceStatus.save_learner_status(
            user.id, DeviceStatus.InsufficientStorage
        )

        with self._stale_rebuild(DeviceSettings, loosen=["landing_page"]):
            with connection.constraint_checks_disabled():
                with connection.cursor() as cursor:
                    cursor.execute(f"DROP TABLE {FacilityUser._meta.db_table}")
            try:
                with self.assertLogs(schema_drift.logger, "ERROR") as logs:
                    _repair_database(connection)

                messages = _messages(logs)
                self.assertIn(FacilityUser._meta.db_table, messages[0])
                self.assertTrue(
                    any(
                        "Could not repair the schema of" in message
                        for message in messages
                    ),
                    messages,
                )
                self.assertFalse(connection.in_atomic_block)
                self.assertTrue(connection.get_autocommit())
                device_settings = DeviceSettings.objects.create()
                DeviceSettings.objects.filter(pk=device_settings.pk).update(
                    landing_page=None
                )
                with self.assertRaises(OperationalError):
                    LearnerDeviceStatus.objects.all().delete()
            finally:
                with connection.constraint_checks_disabled():
                    LearnerDeviceStatus.objects.all().delete()
                with connection.schema_editor() as editor:
                    editor.create_model(FacilityUser)

    def test_leaves_the_connection_usable_when_the_foreign_key_check_fails(self):
        user = self._user()

        with self._stale_rebuild(DeviceSettings, drop=["language_id"]):
            with connection.constraint_checks_disabled():
                FacilityUser.objects.filter(pk=user.pk).update(
                    facility_id=uuid.uuid4().hex
                )

            try:
                with self.assertLogs(schema_drift.logger, "ERROR") as logs:
                    _repair_database(connection)

                self.assertTrue(_messages(logs))
                self.assertFalse(connection.in_atomic_block)
                self.assertTrue(connection.get_autocommit())
                self.assertEqual(DeviceSettings.objects.count(), 0)
                with connection.cursor() as cursor:
                    cursor.execute("PRAGMA foreign_keys")
                    self.assertEqual(cursor.fetchone()[0], 1)
            finally:
                with connection.constraint_checks_disabled():
                    FacilityUser.objects.filter(pk=user.pk).update(
                        facility_id=user.facility_id
                    )

    def test_repairs_other_models_when_one_model_fails(self):
        add_column = schema_drift.SchemaDrift._add_column

        def failing(self, schema_editor, field):
            if self.model._meta.label == OSUser._meta.label:
                raise OperationalError("database is locked")
            return add_column(self, schema_editor, field)

        with self._stale_rebuild(OSUser, drop=["os_username"]):
            with self._stale_rebuild(DeviceSettings, drop=["language_id"]):
                with patch.object(schema_drift.SchemaDrift, "_add_column", failing):
                    with self.assertLogs(schema_drift.logger, "ERROR") as logs:
                        _repair_database(connection)

                messages = _messages(logs)
                self.assertEqual(len(messages), 1, messages)
                self.assertIn(
                    f"Could not repair the schema of {OSUser._meta.label}", messages[0]
                )
                DeviceSettings.objects.create(language_id="en")
                with self.assertRaises(OperationalError):
                    OSUser.objects.create(user=self._user(), os_username="learner")
