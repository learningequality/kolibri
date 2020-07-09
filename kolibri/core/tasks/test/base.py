import os
import tempfile
from contextlib import contextmanager

from kolibri.core.tasks.main import create_db_url
from kolibri.core.tasks.main import make_connection
from kolibri.utils import conf


@contextmanager
def connection():
    database_engine_option = conf.OPTIONS["Database"]["DATABASE_ENGINE"]

    if database_engine_option == "sqlite":
        fd, filepath = tempfile.mkstemp()
        db_url = create_db_url(
            conf.OPTIONS["Database"]["DATABASE_ENGINE"],
            path=filepath,
        )
        engine = make_connection(database_engine_option, db_url)
        yield engine
        engine.dispose()
        os.close(fd)
        try:
            os.remove(filepath)
        except OSError:
            # Don't fail test because of difficulty cleaning up.
            pass
    elif database_engine_option == "postgres":
        db_url = create_db_url(
            conf.OPTIONS["Database"]["DATABASE_ENGINE"],
            name=conf.OPTIONS["Database"]["DATABASE_NAME"],
            password=conf.OPTIONS["Database"]["DATABASE_PASSWORD"],
            user=conf.OPTIONS["Database"]["DATABASE_USER"],
            host=conf.OPTIONS["Database"]["DATABASE_HOST"],
            port=conf.OPTIONS["Database"]["DATABASE_PORT"],
        )
        engine = make_connection(
            database_engine_option,
            db_url,
        )
        yield engine
        engine.dispose()
    else:
        raise Exception(
            "Unknown database engine option: {}".format(database_engine_option)
        )
