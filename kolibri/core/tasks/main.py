import logging
import os
import sqlite3

from django.utils.functional import SimpleLazyObject
from sqlalchemy import create_engine
from sqlalchemy import event
from sqlalchemy import exc

from kolibri.core.sqlite.utils import check_sqlite_integrity
from kolibri.core.sqlite.utils import repair_sqlite_db
from kolibri.core.tasks.storage import Storage
from kolibri.core.tasks.worker import Worker
from kolibri.utils import conf


logger = logging.getLogger(__name__)


def create_db_url(
    db_type, path=None, name=None, password=None, user=None, host=None, port=None
):
    if db_type == "sqlite":
        return "sqlite:///{path}".format(path=path)
    elif db_type == "postgres":
        return "postgresql://{user}:{password}@{host}{port}/{name}".format(
            name=name,
            password=password,
            user=user,
            host=host,
            port=":" + port if port else "",
        )


def make_connection(db_type, url):
    if db_type == "sqlite":
        kwargs = dict(
            connect_args={"check_same_thread": False},
        )

    elif db_type == "postgres":
        kwargs = dict(
            pool_pre_ping=True,
            client_encoding="utf8",
        )
    else:
        raise Exception("Unknown database engine option: {}".format(db_type))

    connection = create_engine(url, **kwargs)

    # Add multiprocessing safeguards as recommended by:
    # https://docs.sqlalchemy.org/en/13/core/pooling.html#pooling-multiprocessing
    # Don't make a connection before we've added the multiprocessing guards
    # as otherwise we will have a connection that doesn't have the 'pid' attribute set.
    @event.listens_for(connection, "connect")
    def connect(dbapi_connection, connection_record):
        connection_record.info["pid"] = os.getpid()

    @event.listens_for(connection, "checkout")
    def checkout(dbapi_connection, connection_record, connection_proxy):
        pid = os.getpid()
        if connection_record.info["pid"] != pid:
            connection_record.connection = connection_proxy.connection = None
            raise exc.DisconnectionError(
                "Connection record belongs to pid %s, attempting to check out in pid %s"
                % (connection_record.info["pid"], pid)
            )

    return connection


def __initialize_connection():
    db_url = create_db_url(
        conf.OPTIONS["Database"]["DATABASE_ENGINE"],
        path=os.path.join(conf.KOLIBRI_HOME, "job_storage.sqlite3"),
        name=conf.OPTIONS["Database"]["DATABASE_NAME"],
        password=conf.OPTIONS["Database"]["DATABASE_PASSWORD"],
        user=conf.OPTIONS["Database"]["DATABASE_USER"],
        host=conf.OPTIONS["Database"]["DATABASE_HOST"],
        port=conf.OPTIONS["Database"]["DATABASE_PORT"],
    )
    connection = make_connection(
        conf.OPTIONS["Database"]["DATABASE_ENGINE"],
        db_url,
    )

    # Check if the database is corrupted
    try:
        check_sqlite_integrity(connection)
    except (exc.DatabaseError, sqlite3.DatabaseError):
        logger.warn("Job storage database has been corrupted, regenerating")
        repair_sqlite_db(connection)

    return connection


connection = SimpleLazyObject(__initialize_connection)


def __job_storage():
    return Storage(connection=connection)


# This storage instance should be used to access job_storage db.
job_storage = SimpleLazyObject(__job_storage)


def initialize_workers():
    logger.info("Starting async task workers.")
    return Worker(
        connection=connection,
        regular_workers=conf.OPTIONS["Tasks"]["REGULAR_PRIORITY_WORKERS"],
        high_workers=conf.OPTIONS["Tasks"]["HIGH_PRIORITY_WORKERS"],
    )
