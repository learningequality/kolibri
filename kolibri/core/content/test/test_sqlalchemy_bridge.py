from django.test import override_settings
from django.test import TestCase
from mock import call
from mock import MagicMock
from mock import Mock
from mock import patch
from sqlalchemy.engine import Engine

from kolibri.core.content.utils.sqlalchemybridge import Bridge
from kolibri.core.content.utils.sqlalchemybridge import ClassNotFoundError
from kolibri.core.content.utils.sqlalchemybridge import get_class
from kolibri.core.content.utils.sqlalchemybridge import get_default_db_string
from kolibri.core.content.utils.sqlalchemybridge import get_engine
from kolibri.core.content.utils.sqlalchemybridge import set_all_class_defaults
from kolibri.core.content.utils.sqlalchemybridge import sqlite_connection_string


@patch("kolibri.core.content.utils.sqlalchemybridge.db_matches_schema")
@patch(
    "kolibri.core.content.utils.sqlalchemybridge.sqlite_connection_string",
    return_value="sqlite://",
)
class SQLAlchemyBridgeClassTestCase(TestCase):
    """
    Testcase for the bridge to SQL Alchemy for Django models
    """

    def test_constructor_sqlite_file_path(
        self, connection_string_mock, db_matches_schema_mock
    ):
        Bridge(sqlite_file_path="test.sqlite3")
        connection_string_mock.assert_called()

    @patch(
        "kolibri.core.content.utils.sqlalchemybridge.get_default_db_string",
        return_value="sqlite://",
    )
    def test_constructor_default_db_path(
        self,
        default_db_string_mock,
        connection_string_mock,
        db_matches_schema_mock,
    ):
        Bridge()
        default_db_string_mock.assert_called()

    @patch("kolibri.core.content.utils.sqlalchemybridge.get_class")
    def test_instance_get_class(
        self,
        get_class_mock,
        connection_string_mock,
        db_matches_schema_mock,
    ):
        bridge = Bridge(sqlite_file_path="test")
        model = MagicMock()
        bridge.get_class(model)
        get_class_mock.assert_called_once_with(model, bridge.Base)

    @patch("kolibri.core.content.utils.sqlalchemybridge.get_class")
    def test_instance_get_table(
        self,
        get_class_mock,
        connection_string_mock,
        db_matches_schema_mock,
    ):
        bridge = Bridge(sqlite_file_path="test")
        model = MagicMock()
        class_mock = MagicMock()
        table = "test_table"
        class_mock.__table__ = table
        get_class_mock.return_value = class_mock
        self.assertEqual(bridge.get_table(model), table)

    def test_instance_get_connection(
        self, connection_string_mock, db_matches_schema_mock
    ):
        connection = "connection"
        bridge = Bridge(sqlite_file_path="test")
        bridge._connection = connection
        self.assertEqual(connection, bridge.connection)

    def test_instance_end(self, connection_string_mock, db_matches_schema_mock):
        engine_mock = MagicMock()
        connection = MagicMock()
        bridge = Bridge(sqlite_file_path="test")
        bridge.engine = engine_mock
        bridge._connection = connection
        bridge.end()
        connection.close.assert_called_once_with()
        engine_mock.dispose.assert_called_once_with()


class SQLAlchemyBridgeSQLAlchemyFunctionsTestCase(TestCase):
    def test_sqlite_string(self):
        self.assertEqual("sqlite:///test", sqlite_connection_string("test"))

    def test_get_engine(self):
        self.assertEqual(type(get_engine("sqlite:///")), Engine)

    def test_get_class_exists(self):
        DjangoModel = MagicMock()
        DjangoModel._meta.db_table = "test"
        Base = MagicMock(classes={"test": "test"})
        self.assertEqual(get_class(DjangoModel, Base), "test")

    def test_get_class_does_not_exist(self):
        DjangoModel = MagicMock()
        DjangoModel._meta.db_table = "test"
        Base = MagicMock(classes={})
        with self.assertRaises(ClassNotFoundError):
            get_class(DjangoModel, Base)


def setUp(self, apps_mock, get_class_mock):
    self.BaseClassMock = MagicMock()
    get_class_mock.return_value = self.BaseClassMock
    self.DjangoModelMock = MagicMock()
    self.DjangoModelMock._meta.fields = []
    apps_mock.get_models.return_value = [self.DjangoModelMock]


@patch("kolibri.core.content.utils.sqlalchemybridge.get_class")
@patch("kolibri.core.content.utils.sqlalchemybridge.apps")
class SQLAlchemyBridgeSetDefaultsTestCase(TestCase):
    def test_set_defaults_calls_get_models(self, apps_mock, get_class_mock):
        # Patched modules don't get passed into the TestCase setUp method
        setUp(self, apps_mock, get_class_mock)
        base = {}
        set_all_class_defaults(base)
        apps_mock.get_models.assert_called_once_with()

    def test_set_defaults_calls_get_class(self, apps_mock, get_class_mock):
        # Patched modules don't get passed into the TestCase setUp method
        setUp(self, apps_mock, get_class_mock)
        base = {}
        set_all_class_defaults(base)
        get_class_mock.assert_called_once_with(self.DjangoModelMock, base)

    def test_field_has_no_default(self, apps_mock, get_class_mock):
        # Patched modules don't get passed into the TestCase setUp method
        setUp(self, apps_mock, get_class_mock)
        base = {}
        field_mock = MagicMock()
        self.DjangoModelMock._meta.fields = [field_mock]
        has_default_mock = Mock(return_value=False)
        field_mock.attach_mock(has_default_mock, "has_default")
        set_all_class_defaults(base)
        has_default_mock.assert_called_once_with()

    @patch("kolibri.core.content.utils.sqlalchemybridge.ColumnDefault")
    def test_field_has_default_no_column(
        self, ColumnDefaultMock, apps_mock, get_class_mock
    ):
        # Patched modules don't get passed into the TestCase setUp method
        setUp(self, apps_mock, get_class_mock)
        baseclass = MagicMock()
        baseclass.attach_mock(MagicMock(), "__table__")
        baseclass.__table__.columns = {}
        get_class_mock.return_value = baseclass
        field_mock = MagicMock()
        self.DjangoModelMock._meta.fields = [field_mock]
        has_default_mock = Mock(return_value=True)
        field_mock.attach_mock(has_default_mock, "has_default")
        field_mock.attname = "test"
        set_all_class_defaults({})
        ColumnDefaultMock.assert_not_called()

    @patch("kolibri.core.content.utils.sqlalchemybridge.ColumnDefault")
    def test_field_has_default_with_column(
        self, ColumnDefaultMock, apps_mock, get_class_mock
    ):
        # Patched modules don't get passed into the TestCase setUp method
        setUp(self, apps_mock, get_class_mock)
        baseclass = MagicMock()
        column = MagicMock()
        baseclass.attach_mock(MagicMock(), "__table__")
        baseclass.__table__.columns = {"test": column}
        get_class_mock.return_value = baseclass
        field_mock = MagicMock()
        self.DjangoModelMock._meta.fields = [field_mock]
        has_default_mock = Mock(return_value=True)
        field_mock.attach_mock(has_default_mock, "has_default")
        field_mock.attname = "test"
        field_mock.default = "test_default"
        set_all_class_defaults({})
        ColumnDefaultMock.method()
        ColumnDefaultMock.method.assert_called()
        ColumnDefaultMock.assert_has_calls([call()._set_parent_with_dispatch(column)])

    @patch("kolibri.core.content.utils.sqlalchemybridge.ColumnDefault")
    def test_field_no_class(self, ColumnDefaultMock, apps_mock, get_class_mock):
        # Patched modules don't get passed into the TestCase setUp method
        setUp(self, apps_mock, get_class_mock)
        baseclass = MagicMock()
        baseclass.attach_mock(MagicMock(), "__table__")
        baseclass.__table__.columns = {}
        get_class_mock.side_effect = ClassNotFoundError()
        set_all_class_defaults({})
        ColumnDefaultMock.assert_not_called()


class SQLAlchemyBridgeDefaultDBStringTestCase(TestCase):
    @override_settings(
        DATABASES={
            "default": {"ENGINE": "django.db.backends.sqlite3", "NAME": "test.sqlite3"}
        }
    )
    def test_sqlite(self):
        self.assertEqual(get_default_db_string(), "sqlite:///test.sqlite3")

    @override_settings(
        DATABASES={
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "USER": "postgres",
                "PASSWORD": "password",
                "NAME": "test",
            }
        }
    )
    def test_no_port_no_host(self):
        self.assertEqual(
            get_default_db_string(), "postgresql://postgres:password@localhost/test"
        )

    @override_settings(
        DATABASES={
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "USER": "postgres",
                "PASSWORD": "password",
                "NAME": "test",
                "HOST": "localhost",
            }
        }
    )
    def test_no_port(self):
        self.assertEqual(
            get_default_db_string(), "postgresql://postgres:password@localhost/test"
        )

    @override_settings(
        DATABASES={
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "USER": "postgres",
                "PASSWORD": "password",
                "NAME": "test",
                "HOST": "localhost",
                "PORT": "1234",
            }
        }
    )
    def test_postgres(self):
        self.assertEqual(
            get_default_db_string(),
            "postgresql://postgres:password@localhost:1234/test",
        )

    @override_settings(
        DATABASES={
            "default": {
                "ENGINE": "django.db.backends.mysql",
                "USER": "mysql",
                "PASSWORD": "password",
                "NAME": "test",
                "HOST": "localhost",
                "PORT": "1234",
            }
        }
    )
    def test_mysql(self):
        self.assertEqual(
            get_default_db_string(), "mysql://mysql:password@localhost:1234/test"
        )

    @override_settings(
        DATABASES={
            "default": {
                "ENGINE": "django.db.backends.oracle",
                "USER": "oracle",
                "PASSWORD": "password",
                "NAME": "test",
                "HOST": "localhost",
                "PORT": "1234",
            }
        }
    )
    def test_oracle(self):
        self.assertEqual(
            get_default_db_string(), "oracle://oracle:password@localhost:1234/test"
        )
