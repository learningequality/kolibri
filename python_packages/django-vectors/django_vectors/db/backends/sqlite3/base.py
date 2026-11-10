from django.db.backends.sqlite3.base import DatabaseWrapper as SQLiteDatabaseWrapper


class DatabaseWrapper(SQLiteDatabaseWrapper):
    """
    The SQLite backend of the library. A project can use it directly as a
    database ENGINE.
    """
