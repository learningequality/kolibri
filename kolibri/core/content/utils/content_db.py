"""
Writable access to a content database file through a Django database alias
registered for the lifetime of a `content_db` block.
"""

import uuid
from contextlib import contextmanager

from django.db import connections
from django.db import DEFAULT_DB_ALIAS
from django.db.utils import load_backend

from kolibri.core.content.models import AssessmentMetaData
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import ContentTag
from kolibri.core.content.models import File
from kolibri.core.content.models import Language
from kolibri.core.content.models import LocalFile

CONTENT_DB_ALIAS_PREFIX = "content_"

# Content databases are sqlite files whatever the default database is.
_ENGINE = "kolibri.deployment.default.db.backends.sqlite3"

# The concrete content models, in an order that satisfies their foreign keys. The
# schema editor creates each model's own many to many through tables, so those must
# not be listed here as well.
_SCHEMA_MODELS = (
    Language,
    ContentTag,
    LocalFile,
    ContentNode,
    File,
    AssessmentMetaData,
    ChannelMetadata,
)


@contextmanager
def content_db(path=None):
    """
    Yield a Django database alias for the content database at path, released along
    with its connection when the block exits.

    A path of None yields the default alias, registering nothing.
    """
    if path is None:
        yield DEFAULT_DB_ALIAS
        return
    alias = CONTENT_DB_ALIAS_PREFIX + uuid.uuid4().hex
    # Block scoped and thread local, so register with the handler rather than
    # settings.DATABASES; the default settings_dict supplies TIME_ZONE, TEST, etc.
    settings_dict = dict(
        connections[DEFAULT_DB_ALIAS].settings_dict,
        ENGINE=_ENGINE,
        NAME=path,
        # Content import writes should wait out lock contention rather than fail.
        OPTIONS={"timeout": 5 * 60},
    )
    connections[alias] = load_backend(_ENGINE).DatabaseWrapper(settings_dict, alias)
    try:
        yield alias
    finally:
        # Deregister before closing, so a failing close cannot leave the alias behind.
        connection = connections[alias]
        del connections[alias]
        connection.close()


def create_schema(alias):
    """
    Create any content tables the database behind alias does not already have.
    """
    connection = connections[alias]
    existing = set(connection.introspection.table_names())
    missing = [
        model for model in _SCHEMA_MODELS if model._meta.db_table not in existing
    ]
    # Leaving the schema editor takes a whole database PRAGMA foreign_key_check, so
    # do not enter it at all when there is nothing to create.
    if not missing:
        return
    with connection.schema_editor() as editor:
        for model in missing:
            editor.create_model(model)


@contextmanager
def attached_database(alias, path, name):
    """
    Attach the content database at path under name, detached when the block exits.
    """
    if not name.isidentifier():
        raise ValueError("Invalid attached database name: {}".format(name))
    with connections[alias].cursor() as cursor:
        # The schema name cannot be bound as a parameter; isidentifier makes it
        # safe to inline.
        cursor.execute("ATTACH DATABASE %s AS " + name, [path])
    try:
        yield
    finally:
        with connections[alias].cursor() as cursor:
            cursor.execute("DETACH DATABASE " + name)
