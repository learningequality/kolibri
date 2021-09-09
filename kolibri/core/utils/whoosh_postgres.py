import os
import tempfile
from io import BytesIO

from sqlalchemy import Column
from sqlalchemy import func
from sqlalchemy import Integer
from sqlalchemy import MetaData
from sqlalchemy import String
from sqlalchemy import Table
from sqlalchemy import UniqueConstraint
from sqlalchemy.exc import IntegrityError
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.sql import select
from sqlalchemy.sql import text
from sqlalchemy.types import LargeBinary
from whoosh.filedb.filestore import FileStorage
from whoosh.filedb.filestore import Storage
from whoosh.filedb.structfile import StructFile
from whoosh.util import random_name


metadata = MetaData()


whooshfile = Table(
    # A DB schema for storing Whoosh index files in PostgreSQL.
    "whooshfile",
    metadata,
    # Auto incrementing integer PK
    Column("id", Integer, primary_key=True, autoincrement=True),
    # The namespace for the storage
    Column("namespace", String, index=True),
    # The filename for the file
    Column("name", String, index=True),
    # The contents of the file
    Column("value", LargeBinary),
    UniqueConstraint("namespace", "name"),
)


class QueryMixin(object):
    def _filter_namespace(self, statement):
        return statement.where(whooshfile.c.namespace == self.namespace)

    def _filter_file(self, statement, name):
        return self._filter_namespace(statement).where(whooshfile.c.name == name)

    def _file_length(self, name):
        return self.engine.execute(
            self._filter_file(select([func.length(whooshfile.c.value)]), name)
        ).fetchone()


class PostgresFile(QueryMixin):
    """
    A file-like object that is backed by the value column of the whooshfile db table.
    """

    __slots__ = "name", "namespace", "engine", "data", "modified", "new"

    def __init__(self, name, namespace, engine):
        self.name = name
        self.namespace = namespace
        self.engine = engine
        result = self.engine.execute(
            self._filter_file(select([whooshfile.c.value]), name)
        ).fetchone()
        if result:
            self.data = BytesIO(result[0])
            self.new = False
        else:
            self.data = BytesIO()
            self.new = True
        self.modified = False

    def close(self):
        if self.modified and not self.new:
            self.engine.execute(
                self._filter_file(whooshfile.update(), self.name).values(
                    value=self.data.getvalue()
                )
            )
        elif self.new:
            self.engine.execute(
                whooshfile.insert().values(
                    name=self.name, namespace=self.namespace, value=self.data.getvalue()
                )
            )
        self.modified = False
        self.new = False

    def tell(self):
        return self.data.tell()

    def write(self, data):
        self.modified = True
        return self.data.write(data)

    def read(self, length):
        return self.data.read(length)

    def seek(self, *args):
        return self.data.seek(*args)

    def readline(self):
        return self.data.readline()


class PostgresLock(object):
    __slots__ = "key", "engine", "locked"

    def __init__(self, name, namespace, engine):
        self.key = hash("{}-{}".format(namespace, name))
        self.engine = engine
        self.locked = False

    def acquire(self, blocking=False):
        query = "SELECT pg_advisory_lock{_shared}({key}) AS lock;".format(
            key=self.key, _shared="_shared" if not blocking else ""
        )
        self.engine.execute(text(query))
        if blocking:
            self.locked = True
        return True

    def release(self):
        if self.locked:
            query = "SELECT pg_advisory_unlock({key}) AS lock;".format(key=self.key)
            self.engine.execute(text(query))


class PostgresStorage(Storage, QueryMixin):
    """
    Storage object that keeps the index in PostgreSQL.
    """

    supports_mmap = False

    def __init__(self, engine, namespace="whoosh"):
        self.namespace = namespace
        self.engine = engine
        # Cache any files that we know exist to avoid doing DB lookups
        self._files = set(self.list())
        self.locks = {}

    def create(self):
        metadata.create_all(self.engine)
        return self

    def destroy(self):
        self.clean()

    def file_modified(self, name):
        return -1

    def list(self):
        # If the table does not exist yet, this will give a ProgrammingError, so just return an empty list
        try:
            return [
                r[0]
                for r in self.engine.execute(
                    self._filter_namespace(select([whooshfile.c.name]))
                )
            ]
        except ProgrammingError:
            return []

    def clean(self):
        self.engine.execute(self._filter_namespace(whooshfile.delete()))
        self._files = set()

    def total_size(self):
        return self.engine.execute(
            self._filter_namespace(select([func.sum(whooshfile.c.size)]))
        ).fetchone()[0]

    def file_exists(self, name):
        return name in self._files

    def file_length(self, name):
        result = self._file_length(name)
        if not result:
            raise NameError
        return result[0]

    def delete_file(self, name):
        result = self.engine.execute(self._filter_file(whooshfile.delete(), name))
        self._files.remove(name)
        if not result.rowcount:
            raise NameError

    def rename_file(self, name, newname, safe=False):
        try:
            result = self.engine.execute(
                self._filter_file(whooshfile.update(), name).values(name=newname)
            )
            self._files.remove(name)
            self._files.add(newname)
            if not result.rowcount:
                raise NameError("File does not exist: {}".format(name))
        except IntegrityError:
            raise NameError("File already exists: {}".format(newname))

    def create_file(self, name, **kwargs):
        self._files.add(name)
        return StructFile(
            PostgresFile(name, self.namespace, self.engine),
            name=name,
            onclose=lambda sfile: sfile.file.close(),
        )

    def open_file(self, name, *args, **kwargs):
        if not self.file_exists(name):
            raise NameError("No such file %r" % name)

        return StructFile(PostgresFile(name, self.namespace, self.engine), name=name)

    def lock(self, name):
        return PostgresLock(name, self.namespace, self.engine)

    def temp_storage(self, name=None):
        tdir = tempfile.gettempdir()
        name = name or "%s.tmp" % random_name()
        path = os.path.join(tdir, name)
        tempstore = FileStorage(path)
        return tempstore.create()
