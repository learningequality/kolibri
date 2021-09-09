import os
import sys
import tempfile
from io import BytesIO

from whoosh.filedb.filestore import FileStorage
from whoosh.filedb.filestore import Storage
from whoosh.filedb.structfile import StructFile
from whoosh.util import random_name


def value_to_bytes(value):
    if sys.version_info < (3, 0) and value is not None:
        # In Python 2.7 Redis always returns str
        # so we must coerce to bytes
        value = bytes(value)
    return value


def value_to_str(value):
    if sys.version_info > (3, 0) and value is not None:
        # In Python 3 Redis always returns bytes
        # so we must coerce to str
        value = value.decode("utf-8")
    return value


class RedisFile(object):
    """
    A file-like object that is backed by the value of a key in a Redis Hash.
    """

    __slots__ = "name", "hash_name", "redis", "data", "modified"

    def __init__(self, name, hash_name, redis):
        self.name = name
        self.hash_name = hash_name
        self.redis = redis
        value = self.redis.hget(self.hash_name, self.name)
        self.data = BytesIO(value_to_bytes(value))
        self.modified = False

    def close(self):
        if self.modified:
            self.redis.hset(self.hash_name, self.name, self.data.getvalue())
        self.modified = False

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


class RedisLock(object):
    __slots__ = "lock"

    def __init__(self, name, namespace, redis):
        key = hash("{}-{}".format(namespace, name))
        self.lock = redis.lock(key)

    def acquire(self, blocking=False):
        self.lock.acquire(blocking=blocking)
        return True

    def release(self):
        self.lock.release()


class RedisStorage(Storage):
    """
    Storage object that keeps the index in Redis.
    """

    supports_mmap = False

    def __init__(self, redis, namespace="whoosh"):
        self.hash_name = "WhooshStore:{}".format(namespace)
        self.redis = redis
        # Cache any files that we know exist to avoid doing DB lookups
        self._files = set(self.list())
        self.locks = {}

    def create(self):
        return self

    def destroy(self):
        self.clean()

    def file_modified(self, name):
        return -1

    def list(self):
        return map(value_to_str, self.redis.hkeys(self.hash_name))

    def clean(self):
        self.redis.delete(self.hash_name)
        self._files = set()

    def total_size(self):
        return sum(self.file_length(f) for f in self.list())

    def file_exists(self, name):
        return name in self._files

    def file_length(self, name):
        if not self.file_exists(name):
            raise NameError
        return self.redis.hstrlen(self.hash_name, name)

    def delete_file(self, name):
        if not self.file_exists(name):
            raise NameError
        self.redis.hdel(self.hash_name, name)

    def rename_file(self, name, newname, safe=False):
        if not self.file_exists(name):
            raise NameError("File %r does not exist" % name)
        if safe and self.file_exists(newname):
            raise NameError("File %r exists" % newname)

        content = value_to_bytes(self.redis.hget(self.hash_name, name))
        pl = self.redis.pipeline()
        pl.hdel(self.hash_name, name)
        pl.hset(self.hash_name, newname, content)
        pl.execute()
        self._files.remove(name)
        self._files.add(newname)

    def create_file(self, name, **kwargs):
        self._files.add(name)
        return StructFile(
            RedisFile(name, self.hash_name, self.redis),
            name=name,
            onclose=lambda sfile: sfile.file.close(),
        )

    def open_file(self, name, *args, **kwargs):
        if not self.file_exists(name):
            raise NameError("No such file %r" % name)

        return StructFile(RedisFile(name, self.hash_name, self.redis), name=name)

    def lock(self, name):
        return RedisLock(name, self.hash_name, self.redis)

    def temp_storage(self, name=None):
        tdir = tempfile.gettempdir()
        name = name or "%s.tmp" % random_name()
        path = os.path.join(tdir, name)
        tempstore = FileStorage(path)
        return tempstore.create()
