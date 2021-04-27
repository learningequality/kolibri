from django.db import connections
from sqlalchemy.pool import NullPool

# get_conn and SharingPool code modified from:
# http://nathansnoggin.blogspot.com/2013/11/integrating-sqlalchemy-into-django.html


def get_conn(self):
    """
    custom connection factory, so we can share with django
    """
    conn = connections["default"]
    return conn.connection


class SharingPool(NullPool):
    """
    custom connection pool that doesn't close connections, and uses our
    custom connection factory
    """

    def __init__(self, get_connection, **kwargs):
        kwargs["reset_on_return"] = False
        super(SharingPool, self).__init__(get_conn, **kwargs)

    def status(self):
        return "Sharing Pool"

    def _do_return_conn(self, conn):
        pass

    def _do_get(self):
        return self._create_connection()

    def _close_connection(self, connection):
        pass

    def dispose(self):
        pass
