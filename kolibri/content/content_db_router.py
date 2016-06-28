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

from django.conf import settings
from django.db import OperationalError, connections
from django.db.utils import ConnectionDoesNotExist

from .errors import ContentModelUsedOutsideDBContext

THREAD_LOCAL = threading.local()


def get_active_content_database():

    # retrieve the temporary thread-local variable that `using_content_database` sets
    alias = getattr(THREAD_LOCAL, 'ACTIVE_CONTENT_DB_ALIAS', None)

    # if no content db alias has been activated, that's a problem
    if not alias:
        raise ContentModelUsedOutsideDBContext()

    # try to connect to the content database, and if connection doesn't exist, create it
    try:
        connections[alias]
    except ConnectionDoesNotExist:
        connections.databases[alias] = {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': os.path.join(settings.CONTENT_DB_DIR, alias + '.sqlite3'),
        }
        try:
            if not connections[alias].introspection.table_names():
                raise KeyError("Content DB '%s' is empty!!" % alias)
        except OperationalError:
            raise KeyError("Content DB '%s' doesn't exist!!" % alias)

    return alias


def set_active_content_database(alias):
    setattr(THREAD_LOCAL, 'ACTIVE_CONTENT_DB_ALIAS', alias)


class ContentDBRouter(object):
    """A router that decides what content database to read from based on a thread-local variable."""

    def _get_db(self, model, **hints):

        # import pdb; pdb.set_trace()

        # only interfere with models from the "content" app, in case we want to use other models in parallel
        if model._meta.app_label != "content":
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
        return True


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
