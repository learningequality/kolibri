import logging
import os
import sqlite3
from importlib import import_module

from django.apps import apps as django_apps
from django.utils.functional import SimpleLazyObject
from sqlalchemy import create_engine
from sqlalchemy import event
from sqlalchemy import exc

from kolibri.core.sqlite.utils import check_sqlite_integrity
from kolibri.core.sqlite.utils import repair_sqlite_db
from kolibri.core.tasks.queue import Queue
from kolibri.core.tasks.scheduler import Scheduler
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

task_queue_name = "kolibri"

priority_queue_name = "no_waiting"

facility_queue_name = "facility"


def __priority_queue():
    return Queue(priority_queue_name, connection=connection)


priority_queue = SimpleLazyObject(__priority_queue)


def __facility_queue():
    return Queue(facility_queue_name, connection=connection)


facility_queue = SimpleLazyObject(__facility_queue)


def __queue():
    return Queue(task_queue_name, connection=connection)


queue = SimpleLazyObject(__queue)


def __scheduler():
    return Scheduler(queue=queue, connection=connection)


scheduler = SimpleLazyObject(__scheduler)


def __job_storage():
    return Storage(connection=connection)


# This storage instance should be used to access job_storage db.
job_storage = SimpleLazyObject(__job_storage)


def initialize_workers():
    logger.info("Starting async task workers.")
    single_worker_pool = Worker(
        connection=connection, regular_workers=4, high_workers=2
    )
    return [single_worker_pool]


def import_tasks_module_from_django_apps(app_configs=None):
    if app_configs is None:
        app_configs = django_apps.get_app_configs()

    logger.info("Importing 'tasks' module from django apps")

    for app_config in app_configs:
        try:
            import_module(".tasks", app_config.module.__name__)
        except ImportError:
            pass
