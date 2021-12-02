import os
import re
import stat
from collections import OrderedDict

from django.contrib.staticfiles import finders
from django.core.files.storage import FileSystemStorage
from django.utils._os import safe_join
from whitenoise import WhiteNoise
from whitenoise.httpstatus_backport import HTTPStatus
from whitenoise.responders import Response
from whitenoise.string_utils import decode_path_info


compressed_file_extensions = ("gz",)

not_found_status = HTTPStatus(404, "Not Found")


class NotFoundStaticFile(object):
    """
    A special static file class to give a not found response,
    rather than letting it be further handled by the wrapped WSGI server.
    """

    def get_response(self, method, request_headers):
        return Response(not_found_status, [], None)


NOT_FOUND = NotFoundStaticFile()


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
        if prefix:
            prefix = prefix + "/"
            if not path.startswith(prefix):
                return None
            path = path[len(prefix) :]
        path = safe_join(root, path)
        if os.path.exists(path):
            return path


class DynamicWhiteNoise(WhiteNoise):
    index_file = "index.html"

    def __init__(
        self, application, dynamic_locations=None, static_prefix=None, **kwargs
    ):
        whitenoise_settings = {
            # Use 120 seconds as the default cache time for static assets
            "max_age": 120,
            # Add a test for any file name that contains a semantic version number
            # or a 32 digit number (assumed to be a file hash)
            # these files will be cached indefinitely
            "immutable_file_test": r"((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)|[a-f0-9]{32})",
            "autorefresh": os.environ.get("KOLIBRI_DEVELOPER_MODE", False),
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
        if static_prefix is not None and not static_prefix.endswith("/"):
            raise ValueError("Static prefix must end in '/'")
        self.static_prefix = static_prefix

    def __call__(self, environ, start_response):
        path = decode_path_info(environ.get("PATH_INFO", ""))
        if self.autorefresh:
            static_file = self.find_file(path)
        else:
            static_file = self.files.get(path)
        if static_file is None:
            static_file = self.find_and_cache_dynamic_file(path)
        if static_file is None:
            return self.application(environ, start_response)
        return self.serve(static_file, environ, start_response)

    def find_and_cache_dynamic_file(self, url):
        path = self.get_dynamic_path(url)
        if path:
            file_stat = os.stat(path)
            # Only try to do matches for regular files.
            if stat.S_ISREG(file_stat.st_mode):
                stat_cache = {path: os.stat(path)}
                for ext in compressed_file_extensions:
                    try:
                        comp_path = "{}.{}".format(path, ext)
                        stat_cache[comp_path] = os.stat(comp_path)
                    except (IOError, OSError):
                        pass
                self.add_file_to_dictionary(url, path, stat_cache=stat_cache)
        elif (
            path is None
            and self.static_prefix is not None
            and url.startswith(self.static_prefix)
        ):
            self.files[url] = NOT_FOUND
        return self.files.get(url)

    def get_dynamic_path(self, url):
        if self.static_prefix is not None and url.startswith(self.static_prefix):
            return finders.find(url[len(self.static_prefix) :])
        if self.dynamic_check is not None and self.dynamic_check.match(url):
            return self.dynamic_finder.find(url)

    def candidate_paths_for_url(self, url):
        paths = super(DynamicWhiteNoise, self).candidate_paths_for_url(url)
        for path in paths:
            yield path
        path = self.get_dynamic_path(url)
        if path:
            yield path
