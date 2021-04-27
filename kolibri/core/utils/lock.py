from contextlib import contextmanager
from sqlite3 import OperationalError

from django.db import connection
from django.db import transaction


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
def db_lock():
    lock_id = 1
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
    elif connection.vendor == "postgresql":
        with transaction.atomic():
            operation = PostgresLock(key=lock_id)
            operation.execute()
            yield
    else:
        raise NotImplementedError(
            "kolibri.core.utils.cache.DatabaseLock not implemented for vendor {vendor}".format(
                vendor=connection.vendor
            )
        )
