from contextlib import contextmanager
from sqlite3 import OperationalError

from django.db import connection
from django.db import transaction
from django.utils.functional import wraps


class DummyOperation(object):
    def __init__(self):
        self.obj = None

    def execute(self):
        from kolibri.core.device.models import SQLiteLock

        self.obj = SQLiteLock.objects.create()

    def revert(self):
        if self.obj:
            self.obj.delete()


class PostgresLock(object):
    def __init__(self, key=None):
        self.key = key

    def execute(self):
        query = "SELECT pg_advisory_xact_lock({key}) AS lock;".format(key=self.key)
        with connection.cursor() as c:
            c.execute(query)


@contextmanager
def db_lock_sqlite_only():
    if connection.vendor == "sqlite":
        while True:
            try:
                with transaction.atomic():
                    operation = DummyOperation()
                    operation.execute()
                    yield
                    operation.revert()
                break
            except OperationalError as e:
                if "database is locked" not in str(e):
                    raise e
    else:
        yield


@contextmanager
def db_lock_postgresql_only():
    lock_id = 1
    if connection.vendor == "postgresql":
        with transaction.atomic():
            operation = PostgresLock(key=lock_id)
            operation.execute()
            yield
    else:
        yield


@contextmanager
def db_lock():
    if connection.vendor == "sqlite":
        with db_lock_sqlite_only():
            yield
    elif connection.vendor == "postgresql":
        with db_lock_postgresql_only():
            yield
    else:
        raise NotImplementedError(
            "kolibri.core.utils.cache.DatabaseLock not implemented for vendor {vendor}".format(
                vendor=connection.vendor
            )
        )


MAX_RETRIES = 5


def retry_on_db_lock(func):
    """
    Decorator that retries a function if it fails due to a database lock.
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        if connection.vendor != "sqlite":
            return func(*args, **kwargs)

        attempts = 0
        while True:
            try:
                attempts += 1
                result = func(*args, **kwargs)
                break
            except OperationalError as e:
                if "database is locked" not in str(e) or attempts >= MAX_RETRIES:
                    raise e
        return result

    return wrapper
