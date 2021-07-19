import os
import re
import stat
from collections import OrderedDict

from django.contrib.staticfiles import finders
from django.core.files.storage import FileSystemStorage
from django.utils._os import safe_join
from whitenoise import WhiteNoise
from whitenoise.string_utils import decode_path_info


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

    def __init__(self, application, dynamic_locations=None, **kwargs):
        whitenoise_settings = {
            # Use 1 day as the default cache time for static assets
            "max_age": 24 * 60 * 60,
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
        else:
            return self.serve(static_file, environ, start_response)

    def find_and_cache_dynamic_file(self, url):
        path = self.get_dynamic_path(url)
        if path:
            file_stat = os.stat(path)
            # Only try to do matches for regular files.
            if stat.S_ISREG(file_stat.st_mode):
                stat_cache = {path: os.stat(path)}
                self.add_file_to_dictionary(url, path, stat_cache=stat_cache)
                return self.files.get(url)

    def get_dynamic_path(self, url):
        if self.dynamic_check is not None and self.dynamic_check.match(url):
            return self.dynamic_finder.find(url)

    def candidate_paths_for_url(self, url):
        paths = super(DynamicWhiteNoise, self).candidate_paths_for_url(url)
        for path in paths:
            yield path
        path = self.get_dynamic_path(url)
        if path:
            yield path


class DjangoWhiteNoise(DynamicWhiteNoise):
    def __init__(self, application, static_prefix=None, **kwargs):
        super(DjangoWhiteNoise, self).__init__(application, **kwargs)
        self.static_prefix = static_prefix
        if not self.autorefresh and self.static_prefix:
            self.add_files_from_finders()

    def add_files_from_finders(self):
        files = {}
        for finder in finders.get_finders():
            for path, storage in finder.list(None):
                prefix = (getattr(storage, "prefix", None) or "").strip("/")
                url = u"".join(
                    (
                        self.static_prefix,
                        prefix,
                        "/" if prefix else "",
                        path.replace("\\", "/"),
                    )
                )
                # Use setdefault as only first matching file should be used
                files.setdefault(url, storage.path(path))
        stat_cache = {path: os.stat(path) for path in files.values()}
        for url, path in files.items():
            self.add_file_to_dictionary(url, path, stat_cache=stat_cache)

    def candidate_paths_for_url(self, url):
        paths = super(DjangoWhiteNoise, self).candidate_paths_for_url(url)
        for path in paths:
            yield path
        if self.autorefresh and url.startswith(self.static_prefix):
            path = finders.find(url[len(self.static_prefix) :])
            if path:
                yield path
