"""
As we store content databases in separate SQLite files per channel, we need dynamic database connection routing.
This file contains a decorator/context manager, `using_content_database`, that allows a specific content
database to be specified for a block of code, as follows:

    with using_content_database("nalanda"):
        objects = ContentNode.objects.all()
        return objects.count()

Thanks to https://github.com/ambitioninc/django-dynamic-db-router for inspiration behind the approach taken here.
"""

import os
import threading
from functools import wraps

from django.apps import apps
from django.conf import settings
from django.db import DEFAULT_DB_ALIAS, connections
from django.db.utils import ConnectionDoesNotExist

from .errors import ContentModelUsedOutsideDBContext

THREAD_LOCAL = threading.local()

_content_databases_with_attached_default_db = set()

# since Django uses pysqlite2 if available, we need to catch its OperationalError instead
try:
    from pysqlite2.dbapi2 import OperationalError
except ImportError:
    from sqlite3 import OperationalError

def default_database_is_attached():
    try:
        alias = get_active_content_database()
    except ContentModelUsedOutsideDBContext:
        return False
    return alias in _content_databases_with_attached_default_db

def get_active_content_database(return_none_if_not_set=False):

    # retrieve the temporary thread-local variable that `using_content_database` sets
    alias = getattr(THREAD_LOCAL, 'ACTIVE_CONTENT_DB_ALIAS', None)

    # if no content db alias has been activated, that's a problem
    if not alias:
        if return_none_if_not_set:
            return None
        else:
            raise ContentModelUsedOutsideDBContext()

    # retrieve the database connection to make sure it's been properly initialized
    get_content_database_connection(alias)

    return alias

def get_content_database_connection(alias=None):

    if not alias:
        alias = get_active_content_database()

    # try to connect to the content database, and if connection doesn't exist, create it
    try:
        connections[alias]
    except ConnectionDoesNotExist:
        if alias.endswith(".sqlite3"):
            filename = alias
        else:
            filename = os.path.join(settings.CONTENT_DATABASE_DIR, alias + '.sqlite3')
        if not os.path.isfile(filename):
            raise KeyError("Content DB '%s' doesn't exist!!" % alias)
        connections.databases[alias] = {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': filename,
        }

        # check that the content database is not empty
        if not connections[alias].introspection.table_names():
            raise KeyError("Content DB '%s' is empty!!" % alias)

    # if possible, attach the default database to the content database connection to enable joins
    _attach_default_database(alias)

    return connections[alias].connection

def _attach_default_database(alias):
    """
    Attach the default (primary) database file to the content database connection, if both use sqlite files.
    This allows us to do direct joins between tables across the two databases, for efficiently integrating
    data from the two sources -- e.g. annotating ContentNodes with progress info from ContentSummaryLogs.
    """
    # if the default database uses a sqlite file, we can't attach it
    default_db = connections.databases[DEFAULT_DB_ALIAS]
    if default_db["ENGINE"].endswith(".sqlite3") and default_db["NAME"].endswith(".sqlite3"):
        default_db_path = connections.databases[DEFAULT_DB_ALIAS]["NAME"]
        try:
            # ensure we're connected to the content database before attaching the default database
            if not connections[alias].connection:
                connections[alias].connect()
            # attach the default database to the content db connection; this allows tables from both databases
            # to be used together in the same query; see https://www.sqlite.org/lang_attach.html
            connections[alias].connection.execute("ATTACH DATABASE '{}' AS defaultdb;".format(default_db_path))
            # record the fact that the default database has been attached to this content database
            _content_databases_with_attached_default_db.add(alias)
        except OperationalError:
            # this will happen if the database is already attached; we can safely ignore
            pass

def set_active_content_database(alias):
    setattr(THREAD_LOCAL, 'ACTIVE_CONTENT_DB_ALIAS', alias)


class ContentDBRouter(object):
    """A router that decides what content database to read from based on a thread-local variable."""

    def _get_db(self, model, **hints):

        from .models import ContentDatabaseModel

        # if the model does not inherit from ContentDatabaseModel, leave it for the default database
        if not issubclass(model, ContentDatabaseModel):
            return None

        # if the model is already associated with a database, use that database
        if hasattr(hints.get("instance", None), "_state"):
            return hints["instance"]._state.db

        # determine the currently active content database, and return the alias
        return get_active_content_database()

    def db_for_read(self, model, **hints):
        return self._get_db(model, **hints)

    def db_for_write(self, model, **hints):
        return self._get_db(model, **hints)

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):

        from .models import ContentDatabaseModel

        model = apps.get_model(app_label=app_label, model_name=model_name) if model_name else None

        # allow migrations for ContentDatabaseModels on non-default DBs, and for others only on default DB
        if model and issubclass(model, ContentDatabaseModel):
            val = db != DEFAULT_DB_ALIAS
        else:
            val = db == DEFAULT_DB_ALIAS

        return val


class using_content_database(object):
    """A decorator and context manager to do queries on a specific content DB.

    :type alias: str
    :param alias: The alias for the content database to run queries on.

    Usage as a context manager:

    .. code-block:: python

        from models import ContentNode

        with using_content_database("nalanda"):
            objects = ContentNode.objects.all()
            return objects.count()

    Usage as a decorator:

    .. code-block:: python

        from models import ContentNode

        @using_content_database('nalanda')
        def delete_all_the_nalanda_content():
            ContentNode.objects.all().delete()

    """

    def __init__(self, alias):
        self.alias = alias

    def __enter__(self):
        self.previous_alias = getattr(THREAD_LOCAL, 'ACTIVE_CONTENT_DB_ALIAS', None)
        set_active_content_database(self.alias)
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        set_active_content_database(self.previous_alias)

    def __call__(self, querying_func):
        # allow using the context manager as a decorator
        @wraps(querying_func)
        def inner(*args, **kwargs):
            # Call the function in our context manager
            with self:
                return querying_func(*args, **kwargs)
        return inner
