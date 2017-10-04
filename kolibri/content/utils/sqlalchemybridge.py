import os
import pickle

from django.apps import apps
from django.conf import settings
from kolibri.content.models import CONTENT_SCHEMA_VERSION, NO_VERSION
from sqlalchemy import ColumnDefault, MetaData, create_engine
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

BASES = {
    CONTENT_SCHEMA_VERSION: None,
    NO_VERSION: None,
}

class ClassNotFoundError(Exception):
    pass

def sqlite_connection_string(db_path):
    # Call normpath to ensure that Windows paths are properly formatted
    return 'sqlite:///{db_path}'.format(db_path=os.path.normpath(db_path))

def get_engine(connection_string):
    """
    Get a SQLAlchemy engine that allows us to connect to a database.
    """
    # Set echo to False, as otherwise we get full SQL Query outputted, which can overwhelm the terminal
    return create_engine(
        connection_string,
        echo=False,
        connect_args={'check_same_thread': False},
        poolclass=QueuePool,
        convert_unicode=True,
    )

def make_session(connection_string):
    """
    Make a session for a particular SQLAlchemy database, this handles opening a connection
    from the engine, and will automatically start transactions for us.
    We use the autoflush option to the sessionmaker in order to have explicit control over
    when we actually commit to the database.
    """
    engine = get_engine(connection_string)
    Session = sessionmaker(bind=engine, autoflush=False)
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
        raise ClassNotFoundError('No SQL Alchemy ORM Mapping for this Django model found in this database')

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


SCHEMA_PATH_TEMPLATE = os.path.join(os.path.dirname(__file__), '../fixtures/{name}_content_schema')

def prepare_bases():

    for name in BASES.keys():

        with open(SCHEMA_PATH_TEMPLATE.format(name=name), 'rb') as f:
            metadata = pickle.load(f)
        BASES[name] = prepare_base(metadata=metadata)


def prepare_base(engine=None, metadata=None, app_name=None):
    """
    Get a Base mapping for a particular database engine and Django app
    A Base mapping defines the mapping from database tables to the SQLAlchemy ORM and is
    our main entrypoint for interacting with arbitrary databases without a predefined schema
    """
    if not metadata:
        # Set up a metadata first so that we can restrict it to only the tables of a particular app
        # If a metadata has been passed in, assume reflection is not necessary
        metadata = MetaData()
        if app_name is not None:
            app_config = apps.get_app_config(app_name)
            table_names = [model._meta.db_table for model in app_config.models.values()]
            # This causes the introspection to be restricted to the table names of the particular Django app
            metadata.reflect(engine, only=table_names)
        else:
            # Otherwise reflect all the database tables
            metadata.reflect(engine)
    # Set up the base mapping using the automap_base method, using the metadata we have defined above
    Base = automap_base(metadata=metadata)
    # TODO map relationship backreferences using the django names
    # Calling Base.prepare() means that Base now has SQLALchemy ORM classes corresponding to
    # every database table that we need
    Base.prepare()
    # Set any Django Model defaults
    set_all_class_defaults(Base)
    # This all took some time, so save this for later in case we need it
    return Base


def get_default_db_string():
    """
    Function to construct a SQLAlchemy database connection string from Django DATABASE settings
    for the default database
    """
    destination_db = settings.DATABASES.get('default')
    if 'sqlite' in destination_db['ENGINE']:
        return sqlite_connection_string(destination_db['NAME'])
    else:
        return '{dialect}://{user}:{password}@{host}{port}/{dbname}'.format(
            dialect=destination_db['ENGINE'].split('.')[-1],
            user=destination_db['USER'],
            password=destination_db['PASSWORD'],
            host=destination_db.get('HOST', 'localhost'),
            port=':' + destination_db.get('PORT') if destination_db.get('PORT') else '',
            dbname=destination_db['NAME'],
        )

class Bridge(object):

    def __init__(self, sqlite_file_path=None, app_name=None):
        if sqlite_file_path is None:
            # If sqlite_file_path is None, we are referencing the Django default database
            self.connection_string = get_default_db_string()
            self.Base = BASES[CONTENT_SCHEMA_VERSION]
        else:
            # Otherwise, we are accessing an external content database.
            # Assume for now that all of these are the 'unversioned' DB schema
            self.connection_string = sqlite_connection_string(sqlite_file_path)
            self.Base = BASES[NO_VERSION]
        self.session, self.engine = make_session(self.connection_string)

        self.connections = []

    def get_class(self, DjangoModel):
        return get_class(DjangoModel, self.Base)

    def get_table(self, DjangoModel):
        return self.get_class(DjangoModel).__table__

    def get_connection(self):
        connection = self.engine.connect()
        self.connections.append(connection)
        return connection

    def end(self):
        # Clean up session
        self.session.close()
        for connection in self.connections:
            connection.close()
