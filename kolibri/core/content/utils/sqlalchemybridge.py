import logging
import os
import pickle
from uuid import UUID

from django.apps import apps
from django.conf import settings
from django.db import connection as django_connection
from sqlalchemy import ColumnDefault
from sqlalchemy import create_engine
from sqlalchemy import event
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.ext.automap import generate_relationship
from sqlalchemy.orm import interfaces
from sqlalchemy.orm import scoped_session
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy.sql import operators
from sqlalchemy.sql.elements import UnaryExpression

from .check_schema_db import db_matches_schema
from .check_schema_db import DBSchemaError
from kolibri.core.content.constants.schema_versions import CONTENT_DB_SCHEMA_VERSIONS
from kolibri.core.content.constants.schema_versions import CURRENT_SCHEMA_VERSION
from kolibri.core.sqlite.pragmas import CONNECTION_PRAGMAS
from kolibri.core.sqlite.pragmas import START_PRAGMAS


def set_sqlite_connection_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.executescript(CONNECTION_PRAGMAS)
    cursor.close()


logger = logging.getLogger(__name__)

BASES = {}


class ClassNotFoundError(Exception):
    pass


# get_conn and SharingPool code modified from:
# http://nathansnoggin.blogspot.com/2013/11/integrating-sqlalchemy-into-django.html


def get_conn(self):
    """
    custom connection factory, so we can share with django
    """
    from django.db import connections

    conn = connections["default"]
    return conn.connection


class SharingPool(NullPool):
    """
    custom connection pool that doesn't close connections, and uses our
    custom connection factory
    """

    def __init__(self, get_connection, **kwargs):
        kwargs["reset_on_return"] = False
        super(SharingPool, self).__init__(get_conn, **kwargs)

    def status(self):
        return "Sharing Pool"

    def _do_return_conn(self, conn):
        pass

    def _do_get(self):
        return self._create_connection()

    def _close_connection(self, connection):
        pass

    def dispose(self):
        pass


def sqlite_connection_string(db_path):
    # Call normpath to ensure that Windows paths are properly formatted
    return "sqlite:///{db_path}".format(db_path=os.path.normpath(db_path))


def get_engine(connection_string):
    """
    Get a SQLAlchemy engine that allows us to connect to a database.
    """
    # Set echo to False, as otherwise we get full SQL Query outputted, which can overwhelm the terminal
    engine = create_engine(
        connection_string,
        echo=False,
        # Set timeout to 60s, as with most of our content import write operations
        # it is more important to complete, than to do so quickly.
        connect_args={"check_same_thread": False, "timeout": 60}
        if connection_string.startswith("sqlite")
        else {},
        poolclass=NullPool,
        convert_unicode=True,
    )
    if connection_string == get_default_db_string() and connection_string.startswith(
        "sqlite"
    ):
        event.listen(engine, "connect", set_sqlite_connection_pragma)
        connection = engine.connect()
        connection.execute(START_PRAGMAS)
        connection.close()

    return engine


def make_session(connection_string):
    """
    Make a session for a particular SQLAlchemy database, this handles opening a connection
    from the engine, and will automatically start transactions for us.
    We use the autoflush option to the sessionmaker in order to have explicit control over
    when we actually commit to the database.
    """
    engine = get_engine(connection_string)
    Session = scoped_session(sessionmaker(bind=engine, autoflush=False))
    return Session(), engine


def get_class(DjangoModel, Base):
    """
    Given a DjangoModel and SQLAlachemy Base mapping that has undergone reflection to have
    SQLAlchemy ORM classes that reflect the current state of the database, return the relevant
    Base class for the passed in DjangoModel class definition
    """
    try:
        # The classes are named, by default, with the name of the table they reflect
        # Use the DjangoModel's _meta db_table attribute to look up the class
        return Base.classes[DjangoModel._meta.db_table]
    except KeyError:
        raise ClassNotFoundError(
            "No SQL Alchemy ORM Mapping for this Django model found in this database"
        )


def set_all_class_defaults(Base):
    """
    Django model fields can have defaults. Unfortunately, these defaults are only set in Python
    not on the database itself, therefore, if we want to use SQLAlchemy to create records in the database
    table, while adhering to these Django field defaults, we have to set them up again on the SQLAlchemy
    class, this method does that to all the classes defined on the passed in Base mapping.
    """
    for DjangoModel in apps.get_models():
        # Iterate through all the Django Models defined
        try:
            # Try to get a class that corresponds to this model
            # This might not exist because we only did a reflection restricted to a few tables, or
            # because we have a database table not reflected in our Django models.
            BaseClass = get_class(DjangoModel, Base)
            for field in DjangoModel._meta.fields:
                # If we do have valid class, we can iterate through the fields and find all the fields that
                # have defaults
                if field.has_default():
                    column = BaseClass.__table__.columns.get(field.attname)
                    # If there are schema differences between the Django model and the particular table
                    # that we are looking at (even though it has the same table name), then the column
                    # with a default value may not exist
                    if column is not None:
                        # The column does exist, set up a default by creating a SQLALchemy ColumnDefault object
                        default = ColumnDefault(field.default)
                        # Set the default of this column to our new default
                        column.default = default
                        # This is necessary, but I can't find the part of the SQLAlchemy source code that
                        # I found this.
                        default._set_parent_with_dispatch(column)
        except ClassNotFoundError:
            pass


SCHEMA_PATH_TEMPLATE = os.path.join(
    os.path.dirname(__file__), "../fixtures/{name}_content_schema"
)


def prepare_bases():

    for name in CONTENT_DB_SCHEMA_VERSIONS + [CURRENT_SCHEMA_VERSION]:

        with open(SCHEMA_PATH_TEMPLATE.format(name=name), "rb") as f:
            metadata = pickle.load(f)
        cascade_relationships = name == CURRENT_SCHEMA_VERSION
        BASES[name] = prepare_base(
            metadata, cascade_relationships=cascade_relationships
        )


def get_model_from_cls(cls):
    return next(
        (
            m
            for m in apps.get_models(include_auto_created=True)
            if m._meta.db_table == cls.__table__.name
        ),
        None,
    )


def get_field_from_model_by_column(model, column):
    return next((f for f in model._meta.fields if f.column == column), None)


def prepare_base(metadata, cascade_relationships=False):
    """
    Create a Base mapping for models for a particular schema version of the content app
    A Base mapping defines the mapping from database tables to the SQLAlchemy ORM and is
    our main entrypoint for interacting with content databases and the content app tables
    of the default database.
    If cascade_relationships is True, then also attempt to use Django model information
    to setup proper relationship cascade behaviour to allow deletion in SQLAlchemy.
    """
    # Set up the base mapping using the automap_base method, using the metadata passed in
    Base = automap_base(metadata=metadata)
    # Calling Base.prepare() means that Base now has SQLALchemy ORM classes corresponding to
    # every database table that we need

    def _gen_relationship(
        base, direction, return_fn, attrname, local_cls, referred_cls, **kw
    ):
        if direction is interfaces.ONETOMANY:
            kw["cascade"] = "all, delete-orphan"
        # Add cascade behaviour on deletion
        return generate_relationship(
            base, direction, return_fn, attrname, local_cls, referred_cls, **kw
        )

    if cascade_relationships:
        Base.prepare(generate_relationship=_gen_relationship)
    else:
        Base.prepare()
    # Set any Django Model defaults
    set_all_class_defaults(Base)
    return Base


def get_default_db_string():
    """
    Function to construct a SQLAlchemy database connection string from Django DATABASE settings
    for the default database
    """
    destination_db = settings.DATABASES.get("default")
    if "sqlite" in destination_db["ENGINE"]:
        return sqlite_connection_string(destination_db["NAME"])
    else:
        return "{dialect}://{user}:{password}@{host}{port}/{dbname}".format(
            dialect=destination_db["ENGINE"].split(".")[-1],
            user=destination_db["USER"],
            password=destination_db["PASSWORD"],
            host=destination_db.get("HOST", "localhost"),
            port=":" + destination_db.get("PORT") if destination_db.get("PORT") else "",
            dbname=destination_db["NAME"],
        )


class SchemaNotFoundError(Exception):
    pass


class Bridge(object):
    def __init__(self, sqlite_file_path=None, schema_version=None, app_name=None):
        if sqlite_file_path is None:
            # If sqlite_file_path is None, we are referencing the Django default database
            self.connection_string = get_default_db_string()
            self.schema_version = schema_version or CURRENT_SCHEMA_VERSION
        else:
            # Otherwise, we are accessing an external database.
            self.connection_string = sqlite_connection_string(sqlite_file_path)
            # If the schema_version is defined, then use the schema_version that was
            # set.
            if schema_version is not None:
                self.schema_version = schema_version
            else:
                # If not, we are probably looking at an imported content db
                # So we try each of our historical database schema in order to see
                # which glass slipper fits! If none do, just turn into a pumpkin.
                for version in CONTENT_DB_SCHEMA_VERSIONS:
                    self.schema_version = version
                    self.session, self.engine = make_session(self.connection_string)
                    try:
                        db_matches_schema(BASES[self.schema_version], self.session)
                        break
                    except DBSchemaError as e:
                        logging.debug(e)
                else:
                    raise SchemaNotFoundError(
                        "No matching schema found for this database"
                    )

        self.Base = BASES[self.schema_version]
        # We are using scoped sessions, so should always return the same session
        # in the same thread
        self.session, self.engine = make_session(self.connection_string)

        if schema_version is not None and sqlite_file_path is not None:
            # In this case we are not using the default database, nor have
            # we inferred the schema version from the schema of the database,
            # so we cannot be sure that the database has the schema properly
            # setup, so we do that here explicitly. If this DB has already
            # had its schema put in place, SQLAlchemy is smart enough for this
            # to be idempotent.
            # Note, that this will not migrate databases if there has been a
            # change in the schema beyond creating tables.
            self.Base.metadata.create_all(self.engine)

        self.connection = None

    def get_class(self, DjangoModel):
        return get_class(DjangoModel, self.Base)

    def get_table(self, DjangoModel):
        """
        Return the SQLAlchemy Table object associated with this Django Model
        https://docs.sqlalchemy.org/en/13/orm/extensions/declarative/table_config.html#using-a-hybrid-approach-with-table
        """
        return self.get_class(DjangoModel).__table__

    def get_raw_connection(self):
        conn = self.get_connection()
        return conn.connection

    def get_connection(self):
        if self.connection is None:
            self.connection = self.engine.connect()
        return self.connection

    def end(self):
        # Clean up session
        self.session.close()
        if self.connection:
            self.connection.close()


def filter_by_uuids(field, ids, validate=True):
    return _by_uuids(field, ids, validate, True)


def exclude_by_uuids(field, ids, validate=True):
    return _by_uuids(field, ids, validate, False)


def _by_uuids(field, ids, validate, include):
    ids_list = list(ids)
    query = "IN (" if include else "NOT IN ("
    # trick to workaround postgresql, it does not allow returning ():
    empty_query = "IS NULL" if include else "IS NOT NULL"
    for (idx, identifier) in enumerate(ids_list):
        if validate:
            try:
                UUID(identifier, version=4)
            except (TypeError, ValueError):
                # the value is not a valid hex code for a UUID, so we don't return any results
                return UnaryExpression(field, modifier=operators.custom_op(empty_query))
        # wrap the uuids in string quotations
        if django_connection.vendor == "postgresql" and validate:
            ids_list[idx] = "'{}'::uuid".format(identifier)
        else:  # sqlite or it's not an uuid
            ids_list[idx] = "'{}'".format(identifier)
    if ids_list:
        placeholder = query + ",".join(ids_list) + ")"
    else:
        placeholder = empty_query
    return UnaryExpression(field, modifier=operators.custom_op(placeholder))
