from django.db import connections
from django.db import DEFAULT_DB_ALIAS
from django.db.migrations.executor import MigrationExecutor
from django.db.migrations.recorder import MigrationRecorder
from django.test import TransactionTestCase

# Modified from https://www.caktusgroup.com/blog/2016/02/02/writing-unit-tests-django-migrations/


ZERO = object()


class TestMigrations(TransactionTestCase):
    database = DEFAULT_DB_ALIAS
    migrate_from = None
    migrate_to = None
    app = None

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        # get the latest migration before starting
        recorder = MigrationRecorder(connections[cls.database])
        latest_migration = recorder.migration_qs.filter(app=cls.app).last()
        cls.latest_migration = (cls.app, latest_migration.name)

    def setUp(self):
        assert self.migrate_from and self.migrate_to, (
            f"TestCase '{type(self).__name__}' must define migrate_from and migrate_to properties"
        )

        from_zero = self.migrate_from is ZERO
        migrate_from = [(self.app, None if from_zero else self.migrate_from)]
        connection = connections[self.database]
        migrate_to = [(self.app, self.migrate_to)]
        executor = MigrationExecutor(connection)
        old_apps = (
            None if from_zero else executor.loader.project_state(migrate_from).apps
        )

        # Reverse to the original migration
        executor.migrate(migrate_from)

        self.setUpBeforeMigration(old_apps)

        # Run the migration to test
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()  # reload.
        executor.migrate(migrate_to)

        self.apps = executor.loader.project_state(migrate_to).apps

    def setUpBeforeMigration(self, apps):
        pass

    @classmethod
    def tearDownClass(cls):
        # revert migration back to latest migration
        executor = MigrationExecutor(connections[cls.database])
        executor.loader.build_graph()
        executor.migrate([cls.latest_migration])

        super().tearDownClass()
