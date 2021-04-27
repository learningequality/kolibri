import os
import tempfile
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

from kolibri.utils import conf


@contextmanager
def connection():
    database_engine_option = conf.OPTIONS["Database"]["DATABASE_ENGINE"]

    if database_engine_option == "sqlite":
        fd, filepath = tempfile.mkstemp()
        engine = create_engine(
            "sqlite:///{path}".format(path=filepath),
            connect_args={"check_same_thread": False},
            poolclass=NullPool,
        )
        yield engine
        engine.dispose()
        os.close(fd)
        try:
            os.remove(filepath)
        except OSError:
            # Don't fail test because of difficulty cleaning up.
            pass
    elif database_engine_option == "postgres":
        engine = create_engine(
            "postgresql://{user}:{password}@{host}{port}/{name}".format(
                name=conf.OPTIONS["Database"]["DATABASE_NAME"],
                password=conf.OPTIONS["Database"]["DATABASE_PASSWORD"],
                user=conf.OPTIONS["Database"]["DATABASE_USER"],
                host=conf.OPTIONS["Database"]["DATABASE_HOST"],
                port=":" + conf.OPTIONS["Database"]["DATABASE_PORT"]
                if conf.OPTIONS["Database"]["DATABASE_PORT"]
                else "",
            ),
            pool_pre_ping=True,
            client_encoding="utf8",
            poolclass=NullPool,
        )
        yield engine
        engine.dispose()
    else:
        raise Exception(
            "Unknown database engine option: {}".format(database_engine_option)
        )
