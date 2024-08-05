import os
import re
import stat
from collections import OrderedDict
from gzip import GzipFile
from http import HTTPStatus
from io import BufferedIOBase
from urllib.parse import parse_qs
from urllib.parse import urljoin
from wsgiref.headers import Headers

from django.contrib.staticfiles import finders
from django.core.exceptions import SuspiciousFileOperation
from django.core.files.storage import FileSystemStorage
from django.utils._os import safe_join
from whitenoise import WhiteNoise
from whitenoise.responders import FileEntry
from whitenoise.responders import MissingFileError
from whitenoise.responders import NOT_ALLOWED_RESPONSE
from whitenoise.responders import Response
from whitenoise.responders import StaticFile
from whitenoise.string_utils import decode_path_info

from kolibri.utils.file_transfer import RemoteFile
from kolibri.utils.urls import validator


compressed_file_extensions = ("gz",)


class NotFoundStaticFile(object):
    """
    A special static file class to give a not found response,
    rather than letting it be further handled by the wrapped WSGI server.
    """

    def get_response(self, method, request_headers):
        return Response(status=HTTPStatus.NOT_FOUND, headers=[], file=None)


NOT_FOUND = NotFoundStaticFile()


def _get_file_path(root, path, prefix=None):
    if prefix:
        prefix = prefix + "/"
        if not path.startswith(prefix):
            return None
        path = path[len(prefix) :]
    return safe_join(root, path)


class FileFinder(finders.FileSystemFinder):
    """
    A modified version of the Django FileSystemFinder class
    which allows us to pass in arbitrary locations to find files
    """

    def __init__(self, locations):
        # List of locations with static files
        self.locations = []
        self.prefixes = set()
        # Maps dir paths to an appropriate storage instance
        self.storages = OrderedDict()
        if not isinstance(locations, (list, tuple)):
            raise TypeError("locations argument is not a tuple or list")
        for root in locations:
            prefix, root = root
            if not prefix:
                raise ValueError(
                    "Cannot use unprefixed locations for dynamic locations"
                )
            else:
                prefix = prefix.rstrip("/")
            if (prefix, root) not in self.locations:
                self.locations.append((prefix, root))
            self.prefixes.add(prefix)
        for prefix, root in self.locations:
            filesystem_storage = FileSystemStorage(location=root)
            filesystem_storage.prefix = prefix
            self.storages[root] = filesystem_storage

    def find_location(self, root, path, prefix=None):
        """
        Finds a requested static file in a location, returning the found
        absolute path (or ``None`` if no match).
        Vendored from Django to handle being passed a URL path instead of a file path.
        """
        path = _get_file_path(root, path, prefix)
        if path and os.path.exists(path):
            return path


class SlicedFile(BufferedIOBase):
    """
    A file like wrapper to handle seeking to the start byte of a range request
    and to return no further output once the end byte of a range request has
    been reached.
    Vendored from https://github.com/evansd/whitenoise/blob/master/whitenoise/responders.py
    as we cannot upgrade whitenoise due to Python 2.7 compatibility issues.
    """

    def __init__(self, fileobj, start, end):
        fileobj.seek(start)
        self.fileobj = fileobj
        self.remaining = end - start + 1

    def read(self, size=-1):
        if self.remaining <= 0:
            return b""
        if size < 0:
            size = self.remaining
        else:
            size = min(size, self.remaining)
        data = self.fileobj.read(size)
        self.remaining -= len(data)
        return data

    def close(self):
        self.fileobj.close()


COMPRESSED_FILE_FOR_REGULAR_PATH = ".compressed_file_for_regular_path"


class TruncatableFileEntry(FileEntry):
    def __init__(self, path, stat_cache=None):
        super(TruncatableFileEntry, self).__init__(path, stat_cache)
        if self.stat.st_size == 0:
            stat_path = "{}.{}".format(path, "file_size")
            if stat_cache is None or stat_path not in stat_cache:
                if os.path.exists(stat_path):
                    with open(stat_path, "r") as f:
                        self.file_size = int(f.read())
                    if stat_cache is not None:
                        stat_cache[stat_path] = self.file_size
            elif stat_cache is not None:
                self.file_size = stat_cache[stat_path]


class EndRangeStaticFile(StaticFile):
    def get_response(self, method, request_headers):
        """
        Vendored from Whitenoise to handle serving truncated compressed files
        streamed from their gzipped counterpart.
        """
        if method not in ("GET", "HEAD"):
            return NOT_ALLOWED_RESPONSE
        if self.is_not_modified(request_headers):
            return self.not_modified_response
        path, headers = self.get_path_and_headers(request_headers)
        if method != "HEAD":
            # This is the only modification - if we have a gzip compressed file
            # but have a non compressed path, then we need to wrap the file handle
            # in a GzipFile object to decompress it.
            if path.endswith(COMPRESSED_FILE_FOR_REGULAR_PATH):
                file_handle = GzipFile(
                    fileobj=open(path[: -len(COMPRESSED_FILE_FOR_REGULAR_PATH)], "rb")
                )
            else:
                file_handle = open(path, "rb")
        else:
            file_handle = None
        range_header = request_headers.get("HTTP_RANGE")
        if range_header:
            try:
                return self.get_range_response(range_header, headers, file_handle)
            except ValueError:
                # If we can't interpret the Range request for any reason then
                # just ignore it and return the standard response (this
                # behaviour is allowed by the spec)
                pass
        return Response(HTTPStatus.OK, headers, file_handle)

    def get_range_response(self, range_header, base_headers, file_handle):
        headers = []
        for item in base_headers:
            if item[0] == "Content-Length":
                size = int(item[1])
            else:
                headers.append(item)
        start, end = self.get_byte_range(range_header, size)
        if start >= end:
            return self.get_range_not_satisfiable_response(file_handle, size)
        if file_handle is not None:
            file_handle = SlicedFile(file_handle, start, end)
        headers.append(("Content-Range", "bytes {}-{}/{}".format(start, end, size)))
        headers.append(("Content-Length", str(end - start + 1)))
        return Response(HTTPStatus.PARTIAL_CONTENT, headers, file_handle)

    @staticmethod
    def get_alternatives(base_headers, files):
        # Sort by size so that the smallest compressed alternative matches first
        # but always put the uncompressed alternative last to allow for our truncation
        # of uncompressed files in production distributions.
        # The key in files is None for the uncompressed version.
        alternatives = []
        files_by_size = sorted(
            files.items(), key=lambda i: (i[0] is None, i[1].stat.st_size)
        )
        gzipped_file = None
        for encoding, file_entry in files_by_size:
            path = file_entry.path
            headers = Headers(base_headers.items())
            headers["Content-Length"] = str(
                getattr(file_entry, "file_size", file_entry.stat.st_size)
            )
            if encoding:
                headers["Content-Encoding"] = encoding
                encoding_re = re.compile(r"\b%s\b" % encoding)
                if encoding == "gzip":
                    gzipped_file = file_entry
            else:
                encoding_re = re.compile("")
                if file_entry.stat.st_size == 0 and gzipped_file is not None:
                    path = gzipped_file.path + COMPRESSED_FILE_FOR_REGULAR_PATH
            alternatives.append((encoding_re, path, headers.items()))
        return alternatives

    @staticmethod
    def get_file_stats(path, encodings, stat_cache):
        """
        Vendored from Whitenoise to handle our truncation of source files
        when we compress them.
        """
        # Primary file has an encoding of None
        files = {None: TruncatableFileEntry(path, stat_cache)}
        if files[None].stat.st_size == 0:
            stat_path = "{}.{}".format(path, "file_size")
            if stat_cache is not None and stat_path in stat_cache:
                setattr(files[None], "file_size", stat_cache[stat_path])
        if encodings:
            for encoding, alt_path in encodings.items():
                try:
                    files[encoding] = FileEntry(alt_path, stat_cache)
                except MissingFileError:
                    continue
        return files

    def get_path_and_headers(self, request_headers):
        """
        Vendored from Whitenoise to handle "*" and no Accept-Encoding header
        """
        accept_encoding = request_headers.get("HTTP_ACCEPT_ENCODING", "*")
        # These are sorted by size so first match is the best
        for encoding_re, path, headers in self.alternatives:
            if accept_encoding == "*" or encoding_re.search(accept_encoding):
                return path, headers


class StreamingStaticFile(EndRangeStaticFile):
    def __init__(self, path, headers, remote_url, encodings=None, stat_cache=None):
        self.path = path
        self.remote_url = remote_url
        super(StreamingStaticFile, self).__init__(path, headers, encodings, stat_cache)

    @staticmethod
    def get_file_stats(path, encodings, stat_cache):
        # Override this method to avoid statting the file
        return {}

    def get_headers(self, headers_list, files):
        headers = Headers(headers_list)
        self.headers = headers
        # Override this method to avoid statting the file
        return headers

    @staticmethod
    def get_alternatives(base_headers, files):
        # Override this method to avoid statting the file
        return []

    def get_response(self, method, request_headers):
        """
        Returns a streaming response for a request.
        Vendored and modified from Whitenoise.
        """
        if method not in ("GET", "HEAD"):
            return NOT_ALLOWED_RESPONSE
        if method != "HEAD":
            try:
                validator(self.remote_url)
                file_handle = RemoteFile(
                    self.path,
                    self.remote_url,
                )
                self.headers["Content-Length"] = str(file_handle.get_file_size())
            except Exception:
                return NOT_FOUND.get_response(method, request_headers)
        else:
            file_handle = None
        range_header = request_headers.get("HTTP_RANGE")
        if range_header:
            try:
                return self.get_range_response(
                    range_header, self.headers.items(), file_handle
                )
            except ValueError:
                # If we can't interpret the Range request for any reason then
                # just ignore it and return the standard response (this
                # behaviour is allowed by the spec)
                pass
        return Response(HTTPStatus.OK, self.headers.items(), file_handle)


def add_headers_function(headers, path, url):
    headers["Accept-Ranges"] = "bytes"


class DynamicWhiteNoise(WhiteNoise):
    index_file = "index.html"

    def __init__(
        self,
        application,
        dynamic_locations=None,
        static_prefix=None,
        writable_locations=(0,),
        app_paths=None,
        **kwargs
    ):
        whitenoise_settings = {
            # Use 120 seconds as the default cache time for static assets
            "max_age": 120,
            # Add a test for any file name that contains a semantic version number
            # or a 32 digit number (assumed to be a file hash)
            # these files will be cached indefinitely
            "immutable_file_test": r"((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)|[a-f0-9]{32})",
            "autorefresh": os.environ.get("KOLIBRI_DEVELOPER_MODE", False),
            "add_headers_function": add_headers_function,
        }
        kwargs.update(whitenoise_settings)
        super(DynamicWhiteNoise, self).__init__(application, **kwargs)
        self.dynamic_finder = FileFinder(dynamic_locations or [])
        # Generate a regex to check if a path matches one of our dynamic
        # location prefixes
        self.dynamic_check = (
            re.compile("^({})".format("|".join(self.dynamic_finder.prefixes)))
            if self.dynamic_finder.prefixes
            else None
        )
        self.writable_locations = {}
        if dynamic_locations:
            for index in writable_locations:
                try:
                    prefix, root = self.dynamic_finder.locations[index]
                    self.writable_locations[prefix] = root
                except IndexError:
                    pass
        self.writable_check = (
            re.compile("^({})".format("|".join(self.writable_locations.keys())))
            if self.writable_locations
            else None
        )
        self.app_path_check = (
            re.compile("^({})".format("|".join(app_paths))) if app_paths else None
        )
        if static_prefix is not None and not static_prefix.endswith("/"):
            raise ValueError("Static prefix must end in '/'")
        self.static_prefix = static_prefix

    def __call__(self, environ, start_response):
        path = decode_path_info(environ.get("PATH_INFO", ""))
        remote_baseurl = parse_qs(environ.get("QUERY_STRING", "")).get(
            "baseurl", [None]
        )[0]
        if self.autorefresh:
            static_file = self.find_file(path)
        else:
            static_file = self.files.get(path)
        if static_file is None and (
            self.app_path_check is None or not self.app_path_check.match(path)
        ):
            static_file = self.find_and_cache_dynamic_file(path, remote_baseurl)
        if static_file is None:
            return self.application(environ, start_response)
        return self.serve(static_file, environ, start_response)

    def find_and_cache_dynamic_file(self, url, remote_baseurl):
        path = self.get_dynamic_path(url)
        if path:
            file_stat = os.stat(path)
            # Only try to do matches for regular files.
            if stat.S_ISREG(file_stat.st_mode):
                stat_cache = {path: file_stat}
                for ext in compressed_file_extensions:
                    try:
                        comp_path = "{}.{}".format(path, ext)
                        stat_cache[comp_path] = os.stat(comp_path)
                    except (IOError, OSError):
                        pass
                self.add_file_to_dictionary(url, path, stat_cache=stat_cache)
        elif (
            remote_baseurl is not None
            and self.writable_check is not None
            and self.writable_check.match(url)
        ):
            self.files[url] = self.get_streaming_static_file(url, remote_baseurl)
        elif (
            path is None
            and self.static_prefix is not None
            and url.startswith(self.static_prefix)
        ):
            self.files[url] = NOT_FOUND
        return self.files.get(url)

    def get_dynamic_path(self, url):
        try:
            if self.static_prefix is not None and url.startswith(self.static_prefix):
                return finders.find(url[len(self.static_prefix) :])
            if self.dynamic_check is not None and self.dynamic_check.match(url):
                return self.dynamic_finder.find(url)
        except SuspiciousFileOperation:
            pass

    def candidate_paths_for_url(self, url):
        paths = super(DynamicWhiteNoise, self).candidate_paths_for_url(url)
        for path in paths:
            yield path
        path = self.get_dynamic_path(url)
        if path:
            yield path

    def get_static_file(self, path, url, stat_cache=None):
        """
        Vendor this function from source to substitute in our
        own StaticFile class that can properly handle ranges.
        """
        # Optimization: bail early if file does not exist
        if stat_cache is None and not os.path.exists(path):
            raise MissingFileError(path)
        headers = Headers([])
        self.add_mime_headers(headers, path, url)
        self.add_cache_headers(headers, path, url)
        if self.allow_all_origins:
            headers["Access-Control-Allow-Origin"] = "*"
        if self.add_headers_function:
            self.add_headers_function(headers, path, url)
        return EndRangeStaticFile(
            path,
            headers.items(),
            stat_cache=stat_cache,
            encodings={"gzip": path + ".gz", "br": path + ".br"},
        )

    def get_streaming_static_file(self, url, remote_baseurl):
        """
        Vendor this function from source to substitute in our
        own StaticFile class that can handle remote files.
        """
        headers = Headers([])
        prefix, local_dir = next(
            (key, self.writable_locations[key])
            for key in self.writable_locations
            if key == url[: len(key)]
        )
        path = _get_file_path(local_dir, url, prefix)
        self.add_mime_headers(headers, path, url)
        self.add_cache_headers(headers, path, url)
        if self.allow_all_origins:
            headers["Access-Control-Allow-Origin"] = "*"
        if self.add_headers_function:
            self.add_headers_function(headers, path, url)
        headers["Content-Encoding"] = ""
        return StreamingStaticFile(
            os.path.join(local_dir, path),
            headers.items(),
            urljoin(remote_baseurl, url.lstrip("/")),
        )
