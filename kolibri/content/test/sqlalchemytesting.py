from kolibri.content.utils.sqlalchemybridge import get_default_db_string

from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

# get_conn and SharingPool code modified from:
# http://nathansnoggin.blogspot.com/2013/11/integrating-sqlalchemy-into-django.html

# custom connection factory, so we can share with django
def get_conn(self):
    from django.db import connections
    conn = connections['default']
    return conn.connection

# custom connection pool that doesn't close connections, and uses our
# custom connection factory
class SharingPool(NullPool):
    def __init__(self, get_connection, **kwargs):
        kwargs['reset_on_return'] = False
        super(SharingPool, self).__init__(get_conn, **kwargs)

    def status(self):
        return 'Sharing Pool'

    def _do_return_conn(self, conn):
        pass

    def _do_get(self):
        return self._create_connection()

    def _close_connection(self, connection):
        pass

    def dispose(self):
        pass

def django_connection_engine():
    if get_default_db_string().startswith('sqlite'):
        return create_engine(get_default_db_string(), poolclass=SharingPool, convert_unicode=True)
    return create_engine(get_default_db_string(), convert_unicode=True)
