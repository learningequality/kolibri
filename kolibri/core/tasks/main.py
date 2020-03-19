import os

from django.utils.functional import SimpleLazyObject
from sqlalchemy import create_engine
from sqlalchemy import event
from sqlalchemy import exc
from sqlalchemy.pool import NullPool

from kolibri.core.sqlite.utils import repair_sqlite_db
from kolibri.core.tasks.queue import Queue
from kolibri.core.tasks.scheduler import Scheduler
from kolibri.core.tasks.worker import Worker
from kolibri.utils import conf


if conf.OPTIONS["Database"]["DATABASE_ENGINE"] == "sqlite":

    def __create_engine():
        return create_engine(
            "sqlite:///{path}".format(
                path=os.path.join(conf.KOLIBRI_HOME, "job_storage.sqlite3")
            ),
            connect_args={"check_same_thread": False},
            poolclass=NullPool,
        )


elif conf.OPTIONS["Database"]["DATABASE_ENGINE"] == "postgres":

    def __create_engine():
        return create_engine(
            "postgresql://{user}:{password}@{host}{port}/{name}".format(
                name=conf.OPTIONS["Database"]["DATABASE_NAME"],
                password=conf.OPTIONS["Database"]["DATABASE_PASSWORD"],
                user=conf.OPTIONS["Database"]["DATABASE_USER"],
                host=conf.OPTIONS["Database"]["DATABASE_HOST"],
                port=":" + conf.OPTIONS["Database"]["DATABASE_PORT"]
                if conf.OPTIONS["Database"]["DATABASE_PORT"]
                else "",
            )
        )


def __initialize_connection():
    connection = __create_engine()

    # Add multiprocessing safeguards as recommended by
    # https://docs.sqlalchemy.org/en/13/core/pooling.html#using-connection-pools-with-multiprocessing

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

    # Don't make a connection before we've added the multiprocessing guards
    # as otherwise we will have a connection that doesn't have the 'pid' attribute set.
    # check if the database is corrupted:
    try:
        connection.execute("SELECT name FROM sqlite_master WHERE type='table';")
    except (exc.DatabaseError, TypeError):
        repair_sqlite_db(connection)

    return connection


connection = SimpleLazyObject(__initialize_connection)

task_queue_name = "kolibri"

priority_queue_name = "no_waiting"


def __priority_queue():
    return Queue(priority_queue_name, connection=connection)


priority_queue = SimpleLazyObject(__priority_queue)


def __queue():
    return Queue(task_queue_name, connection=connection)


queue = SimpleLazyObject(__queue)


def __scheduler():
    return Scheduler(queue=queue, connection=connection)


scheduler = SimpleLazyObject(__scheduler)


def initialize_workers():
    regular_worker = Worker(task_queue_name, connection=connection, num_workers=1)
    priority_worker = Worker(priority_queue_name, connection=connection, num_workers=3)
    return regular_worker, priority_worker
