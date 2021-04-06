import os

from django.contrib.staticfiles import finders
from whitenoise import WhiteNoise


class DjangoWhiteNoise(WhiteNoise):
    def __init__(self, application, static_root=None, static_prefix=None, **kwargs):
        super(DjangoWhiteNoise, self).__init__(application, **kwargs)
        self.static_root = static_root
        self.static_prefix = static_prefix
        if not self.static_root and not self.autorefresh:
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
        if url.startswith(self.static_prefix):
            path = finders.find(url[len(self.static_prefix) :])
            if path:
                yield path
