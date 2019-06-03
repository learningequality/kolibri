import atexit
import os

from iceqube.queue import Queue
from iceqube.worker import Worker
from sqlalchemy import create_engine
from sqlalchemy import event
from sqlalchemy import exc
from sqlalchemy.pool import NullPool

from kolibri.utils import conf

app = "kolibri"


if conf.OPTIONS["Database"]["DATABASE_ENGINE"] == "sqlite":
    connection = create_engine(
        "sqlite:///{path}".format(
            path=os.path.join(conf.KOLIBRI_HOME, "job_storage.sqlite3")
        ),
        connect_args={"check_same_thread": False},
        poolclass=NullPool,
    )

elif conf.OPTIONS["Database"]["DATABASE_ENGINE"] == "postgres":
    connection = create_engine(
        "postgresql://{user}:{password}@{host}:{port}/{name}".format(
            name=conf.OPTIONS["Database"]["DATABASE_NAME"],
            password=conf.OPTIONS["Database"]["DATABASE_PASSWORD"],
            user=conf.OPTIONS["Database"]["DATABASE_USER"],
            host=conf.OPTIONS["Database"]["DATABASE_HOST"],
            port=conf.OPTIONS["Database"]["DATABASE_PORT"],
        )
    )


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


queue = Queue(app, connection=connection)


def initialize_worker():
    worker = Worker(app, connection=connection)
    atexit.register(worker.shutdown)


def get_queue():
    """
    :return: the Queue object
    """
    return queue
